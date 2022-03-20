/**
 * Get the template of a Todo
 */
function getTodoTemplate() {
    return document.importNode(
    // @ts-ignore
    document.querySelector("[data-todo-template]").content, true).firstElementChild;
}
// The container which holds all the todos
const container = document.querySelector(".todos-container");
// Options bar and it's inputs/buttons (opts)
const optionsBar = document.querySelector(".options");
const opts = {
    addButton: document.querySelector("[data-button='add']"),
    delButton: document.querySelector("[data-button='remove']"),
    allButton: document.querySelector("[data-button='all']"),
    importButton: document.querySelector("[data-button='import']"),
    exportButton: document.querySelector("[data-button='export']"),
};
[];
const defaultOptions = {
    title: "",
    body: "",
    date: new Date(),
    color: "#00CED1",
};
/**
 * All the todos that we have in the container
 */
const currentTodos = [];
class Todo {
    element;
    _options; // this needs to be private because options should only be changed by the update method
    subElements = {};
    _isEditing = false;
    _isSelected = false;
    constructor(options) {
        this.element = getTodoTemplate();
        this.element.tabIndex = 0;
        this.subElements = {
            title: this.element.querySelector(".title"),
            body: this.element.querySelector(".body"),
            color: this.element.querySelector(".color-btn"),
            date: this.element.querySelector(".date")
        };
        this.setEvents();
        this.update({ ...defaultOptions, ...options }, false);
        currentTodos.push(this);
        this.show();
    }
    /**
     * Update the todo with the given options
     */
    update(options, autoSave = true) {
        Object.entries(options).forEach(([key, value]) => this[key] = value);
        this._options = { ...this._options, ...options };
        if (autoSave)
            saveTodos();
    }
    /**
     * Set the events for the todo
     */
    setEvents() {
        // we want to add the events when the show animation finishes
        this.element.addEventListener("animationend", () => {
            this.element.addEventListener("click", () => this.toggleSelect());
            this.element.addEventListener("keydown", (e) => {
                if (e.key == "Enter")
                    this.toggleSelect();
                if (e.key == "Escape")
                    this.toggleEdit();
            });
            this.element.addEventListener("dblclick", () => this.toggleEdit());
            // Exit editing when the user presses the enter key in the input
            document.addEventListener("keydown", (event) => {
                if ((event.target === this.subElements.title || event.target === this.subElements.body)
                    && event.key === "Enter") {
                    this.toggleEdit();
                    // we don't want the user to input newlines
                    event.preventDefault();
                }
            });
        }, { once: true });
    }
    /**
     * Show the todo in the container
     */
    show() {
        // play the animation and then remove the animation class after it's done
        this.element.classList.add("in");
        this.element.addEventListener("animationend", () => this.element.classList.remove("in"), { once: true });
        // add the element to the container with all the todos
        container.prepend(this.element);
    }
    /**
     * Remove the todo
     */
    remove() {
        this.element.classList.add("remove");
        currentTodos.splice(currentTodos.indexOf(this), 1);
        // dont remove until "remove" animation ends
        this.element.addEventListener("animationend", () => this.element.remove(), { once: true });
    }
    /**
     * Toggle the todo editing mode
     */
    toggleEdit(state) {
        // remove the selected state
        this.toggleSelect(false);
        const isEditing = this._isEditing;
        /**
         * If the todo is already editing, save the changes and exit editing mode.
         * Note that we only return if:
         * 	- we are editing
         *  - the state is falsy
         *  - updateFromElements returned false
         */
        if (isEditing && !state && !this.updateFromElements())
            return;
        this.element.classList.toggle("edit", state ?? !isEditing);
        [this.subElements.title, this.subElements.body].forEach(e => e.contentEditable = (state ?? !isEditing) ? "true" : "false");
        this.subElements.color.disabled = state ?? isEditing;
        this.subElements.title.focus();
        this._isEditing = state ?? !isEditing;
    }
    /**
     * Toggle the todo selection
     */
    toggleSelect(state) {
        if (this._isEditing)
            return;
        this._isSelected = state ?? !this._isSelected;
        this.element.classList.toggle("selected", state ?? this._isSelected);
    }
    /**
     * Update the todo using the data from the elements in it
     */
    updateFromElements() {
        const [title, body, color] = [
            this.subElements.title.textContent.trim(),
            this.subElements.body.textContent.trim(),
            this.subElements.color.value
        ];
        if (!title) {
            this.shake();
            return false;
        }
        this.update({ title, body, color });
        return true;
    }
    shake() {
        this.element.classList.add("shake");
        this.element.addEventListener("animationend", () => this.element.classList.remove("shake"), { once: true });
    }
    // -------------------- Setters --------------------
    set title(content) {
        this.subElements.title.textContent = content.trim();
    }
    set body(content) {
        this.subElements.body.textContent = content.trim();
    }
    set date(date) {
        this.subElements.date.textContent = date.toLocaleString();
    }
    set color(color) {
        color = checkHexColor(color);
        this.element.style.setProperty("--bg-color", color);
        this.subElements.color.value = color;
    }
    // -------------------- Getters --------------------
    get options() {
        // we need to make sure we save the date in the great format... Ugly!
        return { ...this._options, ...{ date: this._options.date.toLocaleString() } };
    }
    get isEditing() {
        return this._isEditing;
    }
    get isSelected() {
        return this._isSelected;
    }
}
/**
 * Inserts a Todo into the container
 * @param options The options of the Todo
 */
function addTodo(options) {
    if (!options.title.trim())
        return false;
    new Todo(options);
    return true;
}
/**
 * Save the current todos to the local storage
 */
function saveTodos() {
    localStorage.setItem("todos", JSON.stringify(currentTodos.map(t => t.options)));
    console.log("Saved todos: ", currentTodos);
}
/**
 * Load the todos from the local storage and return them
 */
function getTodos() {
    return JSON.parse(localStorage.getItem("todos")) || [];
}
/**
 * Check if a hex color is valid, and return it with a `#rrggbb` format.
 */
function checkHexColor(hex) {
    hex = hex.replaceAll("#", "").toLowerCase();
    if (!/^([\da-f]{3}){1,2}$/.test(hex))
        throw new TypeError("Invalid hex color");
    if (hex.length == 3)
        return "#"
            + hex.split("")
                .map(v => `${v}${v}`)
                .join("");
    return "#" + hex;
}
/** Get a random hex color. */
function randomColor() {
    return "#" + Math.random().toString(16).slice(2, 8);
}
/** Play a pulse error animation on the options bar */
function optionsBarError() {
    optionsBar.classList.add("error");
    optionsBar.addEventListener("animationend", () => optionsBar.classList.remove("error"), { once: true });
}
function downloadFile(filename, data) {
    const element = document.createElement("a");
    element.setAttribute("href", `data:text/plain;charset=utf-8,${encodeURIComponent(data)}`);
    element.setAttribute("download", filename);
    element.style.display = "none";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
}
function exportTodos() {
    const todos = currentTodos.map(t => t.options);
    downloadFile("todos.todos", JSON.stringify(todos));
}
function importTodos() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".todos";
    input.addEventListener("change", () => {
        const file = input.files[0];
        if (!file)
            return;
        const reader = new FileReader();
        reader.addEventListener("load", () => {
            const data = reader.result;
            if (typeof data !== "string")
                return;
            try {
                const todos = JSON.parse(data);
                if (!Array.isArray(todos))
                    return;
                todos.forEach(t => addTodo(t));
                saveTodos();
            }
            catch (e) {
                console.error(e);
                optionsBarError();
            }
        });
        reader.readAsText(file);
    });
    input.click();
    input.remove();
}
// Handle the "Add" button
opts.addButton.addEventListener("click", () => {
    addTodo({
        title: "New Todo",
        color: randomColor(),
    });
    scrollTo(0, 0);
    saveTodos();
});
// Remove all the selected todos
opts.delButton.addEventListener("click", () => {
    const todos = currentTodos.filter(t => t.isSelected);
    if (!todos.length) {
        optionsBarError();
        return;
    }
    // if we have more than 25 todos, just dont do any fancy delaying
    if (todos.length > 25) {
        todos.forEach(t => t.remove());
        saveTodos();
        return;
    }
    todos.reverse().forEach((todo, i) => setTimeout(() => todo.remove(), i * (250 / todos.length)));
    // wait for all the todos to remove before saving
    setTimeout(() => saveTodos(), todos.length * (250 / todos.length));
});
// Toggle the selected class of all the todos
opts.allButton.addEventListener("click", () => {
    if (!currentTodos.length) {
        optionsBarError();
        return;
    }
    // if we have more than 25 todos, just dont do any fancy delaying
    if (currentTodos.length > 25) {
        currentTodos.forEach(t => t.toggleSelect());
        return;
    }
    currentTodos.reverse().forEach((todo, i) => setTimeout(() => todo.toggleSelect(), i * (250 / currentTodos.length)));
});
// Import a file
opts.importButton.addEventListener("click", () => importTodos());
// Export a file
opts.exportButton.addEventListener("click", () => exportTodos());
// Insert the todos from the local storage
getTodos().forEach(options => addTodo(options));
saveTodos();
// If we have no todos, add the default one
if (!currentTodos.length) {
    addTodo({
        title: "Another note",
        body: `Do you want to edit a Todo? Cool! Just double click on it to
		enable the edit mode. Once finished, double click again!
		If you prefer using the keyboard, that's fine! Press "Enter" to select
		it, and "Escape" to edit it.`,
        color: "#483cb5",
    });
    addTodo({
        title: "Welcome to my Todos!",
        body: `So, yeah... This is a Todo! You can add,
		remove, and edit them! That's pretty much it I guess...
		Oh yeah they get saved! (Well, unless you clear your cache or remove them)`
    });
}
// set up the "fancy" color picker
document.querySelectorAll(".color-picker").forEach((picker) => {
    const input = picker.firstElementChild;
    const updateInput = () => picker.style.backgroundColor = input.value;
    input.addEventListener("input", updateInput);
    updateInput();
});
//# sourceMappingURL=todo.js.map