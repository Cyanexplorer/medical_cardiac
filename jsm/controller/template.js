class Page {
	constructor(domElement) {
		this.type = {
			boolean: 0,
			checkbox: 1,
			radioBtn: 2,
			slider: 3,
			dslider: 4,
			group: 5
		}

		this.enable = () => { }
		this.disable = () => { }

		let controller = {}
		let content = document.createElement('div')
		content.style = 'width:100%; display:flex; flex:1 1 auto; flex-direction:column'

		if (domElement != null) {
			domElement.appendChild(content)
		}

		this.createGroup = (title) => {
			let label = document.createElement('label')
			label.innerHTML = title

			content.appendChild(label)

			controller[title] = { label: label }
		}

		this.addBoolean = (title, initValue) => {
			let label = document.createElement('label')
			label.innerHTML = title

			let input = document.createElement('input')
			input.type = 'checkbox'
			input.checked = false

			if (initValue == 1) {
				input.checked = true
			}

			label.appendChild(input)
			content.appendChild(label)

			controller[title] = input
		}

		this.addSingleOption = (title, options, initValue) => {
			let label = document.createElement('label')
			label.innerHTML = title

			let form = document.createElement('form')

			for (let i = 0; i < options.length; i++) {
				let option = document.createElement('input')
				option.type = 'radio'
				option.name = title
				option.innerText = options
				option.value = options

				if (initValue == i) {
					option.checked = true
				}

				form.appendChild(option)
			}
			content.appendChild(form)

			controller[title] = form
		}

		this.addSelector = (title, options, initValue) => {
			let label = document.createElement('label')
			label.innerHTML = title

			let selector = document.createElement('select')

			for (let i = 0; i < options.length; i++) {
				let option = document.createElement('option')
				option.innerHTML = options
				option.value = i
			}

			if (initValue != null && initValue < options.length) {
				selector.selectedIndex = initValue
			}

			content.appendChild(selector)
			controller[title] = selector
		}
	}
}

class SegTools {
    constructor(state, enable = false) {
        this.state = state
        this.onstart = () => { }
        this.onload = () => { }
        this.mode = {}
        this.selectedMode = -1
        this.enable = enable
    }
}

export{Page, SegTools}