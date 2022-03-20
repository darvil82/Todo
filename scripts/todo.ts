/**
 * Get the template of a Todo
 */
function getTodoTemplate(): HTMLDivElement {
	return document.importNode(
		// @ts-ignore
		document.querySelector("[data-todo-template]").content, true
	).firstElementChild
}

// The container which holds all the todos
const container = document.querySelector(".todos-container")

// Options bar and it's inputs/buttons (opts)
const optionsBar = document.querySelector(".options")
const opts = {
	addButton: document.querySelector("[data-button='add']") as HTMLButtonElement,
	delButton: document.querySelector("[data-button='remove']") as HTMLButtonElement,
	allButton: document.querySelector("[data-button='all']") as HTMLButtonElement
}

type HEXColor = String

/**
 * Data that a Todo holds
 */
interface TodoInfo {
	title?: string,
	body?: string,
	date?: Date | string,
	color?: HEXColor
}[]

const defaultOptions: TodoInfo = {
	title: "",
	body: "",
	date: new Date(),
	color: "#00CED1",
}


/**
 * All the todos that we have in the container
 */
const currentTodos: Todo[] = []


class Todo {
	private element: HTMLDivElement
	private _options: TodoInfo	// this needs to be private because options should only be changed by the update method
	private subElements: { [key: string]: any } = {}
	private _isEditing: boolean = false
	private _isSelected: boolean = false


	constructor(options: TodoInfo) {
		this.element = getTodoTemplate()
		this.element.tabIndex = 0
		this.subElements = {
			title: this.element.querySelector(".title") as HTMLSpanElement,
			body: this.element.querySelector(".body") as HTMLSpanElement,
			color: this.element.querySelector(".color-btn") as HTMLInputElement,
			date: this.element.querySelector(".date") as HTMLSpanElement
		}

		this.setEvents()
		this.update({ ...defaultOptions, ...options }, false)
		currentTodos.push(this)
		this.show()
	}

	/**
	 * Update the todo with the given options
	 */
	private update(options: TodoInfo, autoSave: boolean = true) {
		Object.entries(options).forEach(([key, value]) => this[key] = value)
		this._options = { ...this._options, ...options}
		if (autoSave) saveTodos()
	}

	/**
	 * Set the events for the todo
	 */
	private setEvents() {
		// we want to add the events when the show animation finishes
		this.element.addEventListener("animationend", () => {
			this.element.addEventListener("click", () => this.toggleSelect())
			this.element.addEventListener("keydown", (e: KeyboardEvent) => {
				if (e.key == "Enter") this.toggleSelect()
				if (e.key == "Escape") this.toggleEdit()
			})

			this.element.addEventListener("dblclick", () => this.toggleEdit())

			// Exit editing when the user presses the enter key in the input
			document.addEventListener("keydown", (event: KeyboardEvent) => {
				if (
					(event.target === this.subElements.title || event.target === this.subElements.body)
					&& event.key === "Enter"
				) {
					this.toggleEdit()
					// we don't want the user to input newlines
					event.preventDefault()
				}
			})
		}, { once: true })
	}

	/**
	 * Show the todo in the container
	 */
	public show() {
		// play the animation and then remove the animation class after it's done
		this.element.classList.add("in")
		this.element.addEventListener("animationend",
			() => this.element.classList.remove("in"),
			{ once: true }
		)

		// add the element to the container with all the todos
		container.prepend(this.element)
	}

	/**
	 * Remove the todo
	 */
	public remove() {
		this.element.classList.add("remove")
		currentTodos.splice(currentTodos.indexOf(this), 1)
		// dont remove until "remove" animation ends
		this.element.addEventListener("animationend",
			() => this.element.remove(),
			{ once: true }
		)
	}

	/**
	 * Toggle the todo editing mode
	 */
	public toggleEdit(state?: boolean) {
		// remove the selected state
		this.toggleSelect(false)
		const isEditing = this._isEditing

		/**
		 * If the todo is already editing, save the changes and exit editing mode.
		 * Note that we only return if:
		 * 	- we are editing
		 *  - the state is falsy
		 *  - updateFromElements returned false
		 */
		if (isEditing && !state && !this.updateFromElements()) return

		this.element.classList.toggle("edit", state ?? !isEditing);

		[this.subElements.title, this.subElements.body].forEach(
			e => e.contentEditable = (state ?? !isEditing) ? "true" : "false"
		)
		this.subElements.color.disabled = state ?? isEditing
		this.subElements.title.focus()

		this._isEditing = state ?? !isEditing
	}

	/**
	 * Toggle the todo selection
	 */
	public toggleSelect(state?: boolean) {
		if (this._isEditing) return
		this._isSelected = state ?? !this._isSelected
		this.element.classList.toggle("selected", state ?? this._isSelected)
	}

	/**
	 * Update the todo using the data from the elements in it
	 */
	private updateFromElements(): boolean {
		const [title, body, color] = [
			this.subElements.title.textContent.trim(),
			this.subElements.body.textContent.trim(),
			this.subElements.color.value
		]

		if (!title) {
			this.shake()
			return false
		}

		this.update({ title, body, color })
		return true
	}

	public shake() {
		this.element.classList.add("shake")
		this.element.addEventListener(
			"animationend", () => this.element.classList.remove("shake"), { once: true }
		)
	}


	// -------------------- Setters --------------------
	public set title(content: string) {
		this.subElements.title.textContent = content.trim()
	}

	public set body(content: string) {
		this.subElements.body.textContent = content.trim()
	}

	public set date(date: Date | string) {
		this.subElements.date.textContent = date.toLocaleString()
	}

	public set color(color: string) {
		color = checkHexColor(color)
		this.element.style.setProperty("--bg-color", color)
		this.subElements.color.value = color
	}


	// -------------------- Getters --------------------
	public get options() {
		// we need to make sure we save the date in the great format... Ugly!
		return { ...this._options, ...{ date: this._options.date.toLocaleString() } }
	}

	public get isEditing() {
		return this._isEditing
	}

	public get isSelected() {
		return this._isSelected
	}
}


/**
 * Inserts a Todo into the container
 * @param options The options of the Todo
 */
function addTodo(options: TodoInfo) {
	if (!options.title.trim()) return false
	new Todo(options)
	return true
}


// Handle the "Add" button
opts.addButton.addEventListener("click", () => {
	addTodo({
		title: "New Todo",
		color: randomColor(),
	})
	scrollTo(0, 0)
	saveTodos()
})


// Remove all the selected todos
opts.delButton.addEventListener("click", () => {
	const todos = currentTodos.filter(t => t.isSelected)

	if (!todos.length) {
		optionsBarError()
		return
	}

	// if we have more than 25 todos, just dont do any fancy delaying
	if (todos.length > 25) {
		todos.forEach(t => t.remove())
		saveTodos()
		return
	}

	todos.reverse().forEach((todo, i) => setTimeout(() =>
		todo.remove(), i * (250/todos.length)
	))

	// wait for all the todos to remove before saving
	setTimeout(() => saveTodos(), todos.length * (250/todos.length))
})


// Toggle the selected class of all the todos
opts.allButton.addEventListener("click", () => {
	if (!currentTodos.length) {
		optionsBarError()
		return
	}

	// if we have more than 25 todos, just dont do any fancy delaying
	if (currentTodos.length > 25) {
		currentTodos.forEach(t => t.toggleSelect())
		return
	}

	currentTodos.reverse().forEach((todo, i) => setTimeout(() =>
		todo.toggleSelect(), i * (250/currentTodos.length)
	))
})


/**
 * Save the current todos to the local storage
 */
function saveTodos() {
	localStorage.setItem(
		"todos",
		JSON.stringify(currentTodos.map(t => t.options))
	)
	console.log("Saved todos: ", currentTodos)
}


/**
 * Load the todos from the local storage and return them
 */
function getTodos(): TodoInfo[] {
	return JSON.parse(localStorage.getItem("todos")) || []
}


/**
 * Check if a hex color is valid, and return it with a `#rrggbb` format.
 */
function checkHexColor(hex: string): string {
	hex = hex.replaceAll("#", "").toLowerCase()

	if (!/^([\da-f]{3}){1,2}$/.test(hex))
		throw new TypeError("Invalid hex color")

	if (hex.length == 3)
		return "#"
			+ hex.split("")
			.map(v => `${v}${v}`)
			.join("")

	return "#" + hex
}


/** Get a random hex color. */
function randomColor() {
	return "#" + Math.random().toString(16).slice(2, 8)
}


/** Play a pulse error animation on the options bar */
function optionsBarError() {
	optionsBar.classList.add("error")
	optionsBar.addEventListener("animationend",
		() => optionsBar.classList.remove("error"),
		{ once: true }
	)
}




// Insert the todos from the local storage
getTodos().forEach(options => addTodo(options))
saveTodos()

// If we have no todos, add the default one
if (!currentTodos.length) {
	addTodo({
		title: "Another note",
		body: `Do you want to edit a Todo? Cool! Just double click on it to
		enable the edit mode. Once finished, double click again!
		If you prefer using the keyboard, that's fine! Press "Enter" to select
		it, and "Escape" to edit it.`,
		color: "#483cb5",
	})
	addTodo({
		title: "Welcome to my Todos!",
		body: `So, yeah... This is a Todo! You can add,
		remove, and edit them! That's pretty much it I guess...
		Oh yeah they get saved! (Well, unless you clear your cache or remove them)`
	})
}

// set up the "fancy" color picker
document.querySelectorAll(".color-picker").forEach((picker: HTMLDivElement) => {
	const input = picker.firstElementChild as HTMLInputElement
	const updateInput = () => picker.style.backgroundColor = input.value

	input.addEventListener("input", updateInput)
	updateInput()
})
