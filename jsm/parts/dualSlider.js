
class dualSlider {
    constructor(domElement, min = 0, max = 1, step = 0.0001) {
        this.min = min
        this.max = max
        this.step = step
        this.domElement = domElement

        this.lowerBound = document.createElement('input')
        this.lowerBound.type = 'range'
        this.lowerBound.className = 'lower-bound'
        this.lowerBound.min = min
        this.lowerBound.max = max
        this.lowerBound.step = step

        this.distance = document.createElement('input')
        this.distance.type = 'range'
        this.distance.className = 'higher-bound'
        this.distance.min = min
        this.distance.max = max
        this.distance.step = step

        this.domElement.append(this.lowerBound)
        this.domElement.append(this.distance)

        this.lowerBound.addEventListener('input', () => {
           this.update()
        })
        this.update()

        window.addEventListener('resize', () => {
            this.update()
        })

        this.dispatchEvent = (event) => {
            this.lowerBound.dispatchEvent(event)
            this.distance.dispatchEvent(event)
        }
    }

    update = () => {
        let width = Number(this.domElement.clientWidth) - 14
        this.lowerBound.style.width = `${width}px`

        let limit = this.lowerBound.value / this.lowerBound.max
        this.distance.style.width = `${limit * width}px`
        let hwidth = this.distance.clientWidth

        this.distance.style.width = `${Number(hwidth) + (1 - limit) * 16}px`

        let diff = this.distance.max - this.distance.value
        this.distance.max = Number(this.lowerBound.value)
        this.distance.value = this.distance.max - diff
    }

    setLowerValue = (value) => {
        this.lowerBound.value = this.lowerBound.max * 1 - value * 1
        this.update()
    }

    getLowerValue = () => {
        return this.lowerBound.max * 1 - this.lowerBound.value * 1
    }

    getRange = () => {
        return this.distance.value * 1
    }

    setHigherValue = (value) => {
        this.distance.value = value - this.getLowerValue()
    }

    getHigherValue = () => {
        return this.getLowerValue() * 1 + this.getRange() * 1
    }

    /**
     * 
     * 0:lowerBound監聽事件激活
     * 1:distance
     * 
     */
    event = (cb) => {
        this.lowerBound.addEventListener('input', () => {
            cb(this.getLowerValue() * 1, this.getHigherValue() * 1, 0)
        })
        this.distance.addEventListener('input', () => {
            cb(this.getLowerValue() * 1, this.getHigherValue() * 1, 1)
        })
    }


}

export { dualSlider }

