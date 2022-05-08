/**
 * Get the template of a Todo
 */
function getTodoTemplate(): HTMLDivElement {
	return document.importNode(
		document.querySelector<any>("[data-todo-template]").content,
		true
	).firstElementChild
}

// The container which holds all the todos
const container = document.querySelector<HTMLDivElement>(".todos-container")

// Options bar and it's inputs/buttons (opts)
const optionsBar = document.querySelector(".options")
const opts = {
	addButton: document.querySelector<HTMLButtonElement>("[data-button='add']"),
	delButton: document.querySelector<HTMLButtonElement>(
		"[data-button='remove']"
	),
	allButton: document.querySelector<HTMLButtonElement>("[data-button='all']"),
	importButton: document.querySelector<HTMLButtonElement>(
		"[data-button='import']"
	),
	exportButton: document.querySelector<HTMLButtonElement>(
		"[data-button='export']"
	),
}

type HEXColor = string

/**
 * Data that a Todo holds
 */
interface TodoInfo {
	title?: string
	body?: string
	creationDate?: Date | string
	doneDate?: Date | string
	color?: HEXColor
	done?: boolean
}

const defaultOptions: TodoInfo = {
	title: "New Todo",
	body: "",
	creationDate: new Date(),
	doneDate: new Date(),
	color: "#00CED1",
	done: false,
}

/**
 * All the todos that we have in the container
 */
const currentTodos: Todo[] = []

class Todo {
	private element: HTMLDivElement
	private _options: TodoInfo // this needs to be private because options should only be changed by the update method
	private subElements: { [key: string]: any } = {}
	private _isShown: boolean = false
	private _isEditing: boolean = false
	private _isSelected: boolean = false
	private _isDone: boolean = false

	constructor(options: TodoInfo) {
		this.element = getTodoTemplate()
		this.element.tabIndex = 0
		this.subElements = {
			title: this.element.querySelector<HTMLSpanElement>(".title"),
			body: this.element.querySelector<HTMLSpanElement>(".body"),
			color: this.element.querySelector<HTMLSpanElement>(".color-btn"),
			creationDate:
				this.element.querySelector<HTMLSpanElement>(".date-creation"),
			doneDate: this.element.querySelector<HTMLSpanElement>(".date-done"),
			done: this.element.querySelector<HTMLButtonElement>(".done-btn"),
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
		Object.entries(options).forEach(([key, value]) => (this[key] = value))
		this._options = { ...this._options, ...options }
		if (autoSave) saveTodos()
	}

	/**
	 * Set the events for the todo
	 */
	private setEvents() {
		// we want to add the events when the show animation finishes
		this.element.addEventListener(
			"animationend",
			() => {
				this.element.addEventListener("click", () => this.toggleSelect())
				this.element.addEventListener("keydown", (e: KeyboardEvent) => {
					if (e.key == "Enter") this.toggleSelect()
					if (e.key == "Escape") this.toggleEdit()
				})

				this.element.addEventListener("dblclick", () => this.toggleEdit())

				// Exit editing when the user presses the enter key in the input
				document.addEventListener("keydown", (event: KeyboardEvent) => {
					if (
						(event.target === this.subElements.title ||
							event.target === this.subElements.body) &&
						event.key === "Enter"
					) {
						this.toggleEdit()
						// we don't want the user to input newlines
						event.preventDefault()
					}
				})
			},
			{ once: true }
		)
		this.subElements.done.addEventListener("click", (e: Event) => {
			this.toggleDone()
			e.stopPropagation()
		})
	}

	/**
	 * Show the todo in the container
	 */
	public show() {
		// play the animation and then remove the animation class after it's done
		this.element.classList.add("in")
		this.element.addEventListener(
			"animationend",
			() => {
				this.element.classList.remove("in")
				this._isShown = true
			},
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
		this.element.addEventListener("animationend", () => this.element.remove(), {
			once: true,
		})
	}

	/**
	 * Toggle the todo editing mode
	 */
	public toggleEdit(state?: boolean) {
		/**
		 * If the todo is already editing, save the changes and exit editing mode.
		 * Note that we only return if:
		 * 	- we are editing
		 *  - the state is falsy
		 *  - updateFromElements returned false
		 */
		if (this._isEditing && !state && !this.updateFromElements()) return

		this._isEditing = state ?? !this._isEditing

		// remove the selected state
		this.toggleSelect(false)
		this.element.classList.toggle("edit", this._isEditing)
		;[this.subElements.title, this.subElements.body].forEach(
			e => (e.contentEditable = this._isEditing ? "true" : "false")
		)
		this.subElements.color.disabled = !this._isEditing
		this.subElements.title.focus()
	}

	/**
	 * Toggle the todo selection
	 */
	public toggleSelect(state?: boolean) {
		if (this._isEditing || !this._isShown) return
		this._isSelected = state ?? !this._isSelected
		this.element.classList.toggle("selected", this._isSelected)
	}

	/**
	 * Update the todo using the data from the elements in it, and save the todos
	 */
	private updateFromElements(): boolean {
		const [title, body, color] = [
			this.subElements.title.textContent.trim(),
			this.subElements.body.textContent.trim(),
			this.subElements.color.value,
		]

		if (!title) {
			this.shake()
			return false
		}

		this.update({ title, body, color })
		return true
	}

	/**
	 * Shake the todo
	 */
	public shake() {
		this.element.classList.add("shake")
		this.element.addEventListener(
			"animationend",
			() => this.element.classList.remove("shake"),
			{ once: true }
		)
	}

	/**
	 * Toggle whether the todo is done or not. This will inmediately save
	 * all todos.
	 * @param state The state to set the todo to
	 */
	public toggleDone(state?: boolean) {
		if (state === this._isDone) return
		this.update({ done: state ?? !this._isDone, doneDate: new Date() })
	}

	// -------------------- Setters --------------------
	public set title(content: string) {
		this.subElements.title.textContent = content.trim()
	}

	public set body(content: string) {
		this.subElements.body.textContent = content.trim()
	}

	public set creationDate(date: Date | string) {
		this.subElements.creationDate.textContent = date.toLocaleString()
	}

	public set doneDate(date: Date | string) {
		this.subElements.doneDate.textContent = date.toLocaleString()
	}

	public set color(color: string) {
		color = checkHexColor(color)
		this.element.style.setProperty("--bg-color", color)
		this.subElements.color.value = color
	}

	public set done(done: boolean) {
		this.element.classList.toggle("done", done)
		this._isDone = done
	}

	// -------------------- Getters --------------------
	public get options() {
		// we need to make sure we save the date in the great format... Ugly!
		return {
			...this._options,
			...{
				creationDate: this._options.creationDate.toLocaleString(),
				doneDate: this._options.doneDate.toLocaleString(),
			},
		}
	}

	public get isEditing() {
		return this._isEditing
	}

	public get isSelected() {
		return this._isSelected
	}

	public get isDone() {
		return this._isDone
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

/**
 * Save the current todos to the local storage
 */
const saveTodos = debounce(() => {
	localStorage.setItem(
		"todos",
		JSON.stringify(currentTodos.map(t => t.options))
	)
	console.log("Saved todos: ", currentTodos)
})

/**
 * Load the todos from the local storage and return them
 */
function getTodos(): TodoInfo[] {
	return JSON.parse(localStorage.getItem("todos")) || []
}

/**
 * Check if a hex color is valid, and return it with a `#rrggbb` format.
 */
function checkHexColor(hex: HEXColor): HEXColor {
	hex = hex.replaceAll("#", "").toLowerCase()

	if (!/^([\da-f]{3}){1,2}$/.test(hex)) throw new TypeError("Invalid hex color")

	if (hex.length == 3)
		return (
			"#" +
			hex
				.split("")
				.map(v => `${v}${v}`)
				.join("")
		)

	return "#" + hex
}

/** Get a random hex color. */
function randomColor() {
	return "#" + Math.random().toString(16).slice(2, 8)
}

/** Play a pulse error animation on the options bar */
function optionsBarError() {
	optionsBar.classList.add("error")
	optionsBar.addEventListener(
		"animationend",
		() => optionsBar.classList.remove("error"),
		{ once: true }
	)
}

function downloadFile(filename: string, data: string) {
	const element = document.createElement("a")
	element.setAttribute(
		"href",
		`data:text/plain;charset=utf-8,${encodeURIComponent(data)}`
	)
	element.setAttribute("download", filename)
	element.style.display = "none"
	document.body.appendChild(element)
	element.click()
	document.body.removeChild(element)
}

function exportTodos() {
	const todos = currentTodos.map(t => t.options)
	if (!todos.length) {
		optionsBarError()
		return
	}
	downloadFile("todos.todos", JSON.stringify(todos))
}

function importTodos() {
	const input = document.createElement("input")
	input.type = "file"
	input.accept = ".todos"
	input.addEventListener("change", () => {
		const file = input.files[0]
		if (!file) return

		const reader = new FileReader()
		reader.addEventListener("load", () => {
			const data = reader.result
			if (typeof data !== "string") return

			try {
				const todos = JSON.parse(data)
				if (!Array.isArray(todos)) return

				todos.forEach(t => addTodo(t))
				saveTodos()
			} catch (e) {
				console.error(e)
				optionsBarError()
			}
		})
		reader.readAsText(file)
	})
	input.click()
	input.remove()
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
opts.delButton.addEventListener("click", () =>
	forEachTodo(
		currentTodos.filter(t => t.isSelected),
		t => t.remove()
	)
)

// Toggle the selected class of all the todos
opts.allButton.addEventListener("click", () =>
	// slice the array to prevent its mutation
	forEachTodo(currentTodos.slice().reverse(), t => t.toggleSelect(), false)
)

/**
 * Call a callback for each Todo.
 * - If there are no todos, the options bar will show the error animation.
 * - If there are more than 25 todos, no delay per todo will be applied.
 * @param todos The todos to iterate
 * @param callback The callback to call for each Todo
 * @param save Whether to save the todos after each iteration
 */
function forEachTodo(
	todos: Todo[],
	callback: (todo: Todo) => void,
	save: boolean = true
) {
	if (!todos.length) {
		optionsBarError()
		return
	}

	// if we have more than 25 todos, just dont do any fancy delaying
	if (todos.length > 25) {
		todos.forEach(t => callback(t))
		if (save) saveTodos()
		return
	}

	todos.forEach((t, i) =>
		setTimeout(() => {
			callback(t)
			if (save) saveTodos()
		}, i * (250 / todos.length))
	)
}

function debounce(func: Function, delay: number = 500): Function {
	let timer: number
	return (...args: any[]) => {
		clearTimeout(timer)
		timer = setTimeout(() => {
			func.apply(this, args)
		}, delay)
	}
}

// Import a file
opts.importButton.addEventListener("click", () => importTodos())

// Export a file
opts.exportButton.addEventListener("click", () => exportTodos())

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
		Oh yeah they get saved! (Well, unless you clear your cache or remove them)`,
	})
}
