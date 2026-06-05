const menuElement = document.getElementById('menu')
const cartItemsElement = document.getElementById('cart-items')
const cartTotalElement = document.getElementById('cart-total')
const btnOrder = document.getElementById('btn-order')
const orderSummaryElement = document.getElementById('order-summary')
const btnConfirmOrder = document.getElementById('btn-confirm-order')
const ordersElement = document.getElementById('orders')
const notificationElement = document.getElementById('notification')

const orderModal = new bootstrap.Modal(document.getElementById('orderModal'))
const toast = new bootstrap.Toast(notificationElement)

let menu = []
let cart = JSON.parse(localStorage.getItem('cart')) || []
let orders = JSON.parse(localStorage.getItem('orders')) || []

async function loadMenu() {
    try {
        const response = await fetch('https://keligmartin.github.io/api/menu.json')
        menu = await response.json()
        renderMenu()
    } catch (error) {
        showToast('Erreur pendant le chargement du menu')
    }
}

function saveData() {
    localStorage.setItem('cart', JSON.stringify(cart))
    localStorage.setItem('orders', JSON.stringify(orders))
}

function formatPrice(price) {
    return price.toFixed(2) + ' €'
}

function getImageUrl(image) {
    if (!image) {
        return ''
    }

    if (image.startsWith('http')) {
        return image
    }

    return 'https://keligmartin.github.io/api/' + image
}

function renderMenu() {
    menuElement.innerHTML = ''

    menu.forEach(function (dish) {
        const col = document.createElement('div')
        col.className = 'col-md-6'

        col.innerHTML = `
            <div class="card h-100 shadow-sm">
                <img src="${getImageUrl(dish.image)}" class="card-img-top" alt="${dish.name}">
                <div class="card-body">
                    <h5 class="card-title">${dish.name}</h5>
                    <p class="card-text">${dish.description || 'Plat du food truck'}</p>
                    <p class="fw-bold">${formatPrice(dish.price)}</p>
                    <button class="btn btn-primary btn-add" data-id="${dish.id}">
                        Ajouter
                    </button>
                </div>
            </div>
        `

        menuElement.appendChild(col)
    })

    const buttons = document.querySelectorAll('.btn-add')

    buttons.forEach(function (button) {
        button.addEventListener('click', function () {
            addToCart(Number(button.dataset.id))
        })
    })
}

function addToCart(id) {
    const dish = menu.find(function (item) {
        return item.id === id
    })

    const itemInCart = cart.find(function (item) {
        return item.id === id
    })

    if (itemInCart) {
        itemInCart.quantity++
    } else {
        cart.push({
            id: dish.id,
            name: dish.name,
            price: dish.price,
            quantity: 1
        })
    }

    saveData()
    renderCart()
    showToast('Plat ajouté au panier')
}

function renderCart() {
    cartItemsElement.innerHTML = ''

    if (cart.length === 0) {
        cartItemsElement.innerHTML = `
            <p class="text-muted">
                Votre panier est vide.
            </p>
        `
    } else {
        cart.forEach(function (item) {
            const row = document.createElement('div')
            row.className = 'd-flex justify-content-between align-items-center mb-2'

            row.innerHTML = `
                <div>
                    <strong>${item.name}</strong>
                    <br>
                    <small>${formatPrice(item.price)}</small>
                </div>
                <div class="d-flex align-items-center gap-2">
                    <button class="btn btn-sm btn-outline-secondary btn-minus" data-id="${item.id}">-</button>
                    <span>${item.quantity}</span>
                    <button class="btn btn-sm btn-outline-secondary btn-plus" data-id="${item.id}">+</button>
                </div>
            `

            cartItemsElement.appendChild(row)
        })
    }

    cartTotalElement.innerText = formatPrice(getCartTotal())
    btnOrder.disabled = cart.length === 0

    const buttonsPlus = document.querySelectorAll('.btn-plus')
    const buttonsMinus = document.querySelectorAll('.btn-minus')

    buttonsPlus.forEach(function (button) {
        button.addEventListener('click', function () {
            updateQuantity(Number(button.dataset.id), 1)
        })
    })

    buttonsMinus.forEach(function (button) {
        button.addEventListener('click', function () {
            updateQuantity(Number(button.dataset.id), -1)
        })
    })
}

function updateQuantity(id, value) {
    const item = cart.find(function (cartItem) {
        return cartItem.id === id
    })

    item.quantity = item.quantity + value

    if (item.quantity <= 0) {
        cart = cart.filter(function (cartItem) {
            return cartItem.id !== id
        })
    }

    saveData()
    renderCart()
}

function getCartTotal() {
    return cart.reduce(function (total, item) {
        return total + item.price * item.quantity
    }, 0)
}

function openOrderSummary() {
    const totalHT = getCartTotal()
    const tva = totalHT * 0.1
    const totalTTC = totalHT + tva

    let html = '<ul class="list-group mb-3">'

    cart.forEach(function (item) {
        html += `
            <li class="list-group-item d-flex justify-content-between">
                <span>${item.name} x ${item.quantity}</span>
                <span>${formatPrice(item.price * item.quantity)}</span>
            </li>
        `
    })

    html += '</ul>'

    html += `
        <p>Prix HT : <strong>${formatPrice(totalHT)}</strong></p>
        <p>TVA : <strong>${formatPrice(tva)}</strong></p>
        <p>Total TTC : <strong>${formatPrice(totalTTC)}</strong></p>
    `

    orderSummaryElement.innerHTML = html
    orderModal.show()
}

function activeOrdersCount() {
    return orders.filter(function (order) {
        return order.status !== 'Livré !'
    }).length
}

async function fakePostCommande() {
    await wait(1000)

    if (Math.random() < 0.1) {
        throw new Error('Erreur commande')
    }

    return true
}

function wait(time) {
    return new Promise(function (resolve) {
        setTimeout(resolve, time)
    })
}

async function confirmOrder() {
    if (activeOrdersCount() >= 5) {
        showToast('Il y a déjà 5 commandes en cours')
        return
    }

    const order = {
        id: Date.now(),
        items: cart.map(function (item) {
            return {
                id: item.id,
                name: item.name,
                price: item.price,
                quantity: item.quantity
            }
        }),
        total: getCartTotal(),
        status: 'Préparation'
    }

    try {
        btnConfirmOrder.disabled = true
        btnConfirmOrder.innerText = 'Validation...'

        await fakePostCommande()

        orders.push(order)
        cart = []

        saveData()
        renderCart()
        renderOrders()

        orderModal.hide()
        showToast('Commande validée')

        followOrder(order.id)
    } catch (error) {
        showToast('Erreur sur la commande')
    }

    btnConfirmOrder.disabled = false
    btnConfirmOrder.innerText = 'Valider'
}

function renderOrders() {
    ordersElement.innerHTML = ''

    if (orders.length === 0) {
        ordersElement.innerHTML = '<p class="text-muted">Aucune commande en cours.</p>'
        return
    }

    orders.forEach(function (order) {
        const col = document.createElement('div')
        col.className = 'col-md-4'

        let itemsHtml = ''

        order.items.forEach(function (item) {
            itemsHtml += `<li>${item.name} x ${item.quantity}</li>`
        })

        let cancelButton = ''

        if (order.status === 'Préparation') {
            cancelButton = `
                <button class="btn btn-sm btn-danger btn-cancel-order" data-id="${order.id}">
                    Annuler
                </button>
            `
        }

        col.innerHTML = `
            <div class="card shadow-sm">
                <div class="card-body">
                    <h5 class="card-title">Commande #${order.id}</h5>
                    <ul>${itemsHtml}</ul>
                    <p>Total : <strong>${formatPrice(order.total)}</strong></p>
                    <p>Statut : <strong>${order.status}</strong></p>
                    ${cancelButton}
                </div>
            </div>
        `

        ordersElement.appendChild(col)
    })

    const cancelButtons = document.querySelectorAll('.btn-cancel-order')

    cancelButtons.forEach(function (button) {
        button.addEventListener('click', function () {
            cancelOrder(Number(button.dataset.id))
        })
    })
}

function cancelOrder(id) {
    const order = orders.find(function (item) {
        return item.id === id
    })

    if (order && order.status === 'Préparation') {
        orders = orders.filter(function (item) {
            return item.id !== id
        })

        saveData()
        renderOrders()
        showToast('Commande annulée')
    }
}

async function followOrder(id) {
    await wait(3000)

    let order = orders.find(function (item) {
        return item.id === id
    })

    if (!order || order.status !== 'Préparation') {
        return
    }

    order.status = 'En livraison'
    saveData()
    renderOrders()

    await wait(3000)

    order = orders.find(function (item) {
        return item.id === id
    })

    if (!order) {
        return
    }

    order.status = 'Livré !'
    saveData()
    renderOrders()
    showToast('Commande livrée')
}

function showToast(message) {
    const body = notificationElement.querySelector('.toast-body')
    body.innerText = message
    toast.show()
}

btnOrder.addEventListener('click', openOrderSummary)
btnConfirmOrder.addEventListener('click', confirmOrder)

loadMenu()
renderCart()
renderOrders()

orders.forEach(function (order) {
    if (order.status !== 'Livré !') {
        followOrder(order.id)
    }
})