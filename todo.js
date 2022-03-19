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
    inputTitle: document.querySelector("[data-input='title']"),
    inputBody: document.querySelector("[data-input='body']"),
    inputColor: document.querySelector("[data-input='color']"),
    delButton: document.querySelector("[data-input='remove']"),
    allButton: document.querySelector("[data-input='all']")
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
    isEditing = false;
    isSelected = false;
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
        Object.entries(options)
            .forEach(function ([key, value]) { this[key] = value; }, this);
        this._options = { ...this._options, ...options };
        if (autoSave)
            saveTodos();
    }
    /**
     * Set the events for the todo
     */
    setEvents() {
        this.element.addEventListener("click", this.toggleSelect.bind(this));
        this.element.addEventListener("keydown", function (e) {
            if (e.key == "Enter")
                this.toggleSelect();
            if (e.key == "Escape")
                this.toggleEdit();
        }.bind(this));
        this.element.addEventListener("dblclick", this.toggleEdit.bind(this));
        // Exit editing when the user presses the enter key in the input
        document.addEventListener("keydown", function (event) {
            if ((event.target === this.subElements.title
                || event.target === this.subElements.body)
                && event.key === "Enter")
                this.toggleEdit();
        }.bind(this));
    }
    /**
     * Remove the todo
     */
    remove() {
        this.element.classList.add("remove");
        currentTodos.splice(currentTodos.indexOf(this), 1);
        // dont remove until "remove" animation ends
        this.element.addEventListener("animationend", () => this.element.remove());
    }
    /**
     * Toggle the todo editing mode
     */
    toggleEdit() {
        // remove the selected class
        this.element.classList.remove("selected");
        const isEditing = this.isEditing;
        if (isEditing) {
            if (!this.updateFromElements())
                return;
        }
        this.element.classList.toggle("edit", !isEditing);
        [this.subElements.title, this.subElements.body].forEach(e => e.contentEditable = isEditing ? "false" : "true");
        this.subElements.color.disabled = isEditing;
        this.isEditing = !isEditing;
    }
    /**
     * Toggle the todo selection
     */
    toggleSelect() {
        if (this.isEditing)
            return;
        this.element.classList.toggle("selected");
        this.isSelected = !this.isSelected;
    }
    /**
     * Show the todo in the container
     */
    show() {
        // play the animation and remove it after .5s
        this.element.classList.add("in");
        setTimeout(() => this.element.classList.remove("in"), 750);
        // add the element to the container with all the todos
        container.prepend(this.element);
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
            // we reset the contents to prevent the user from typing newlines
            this.subElements.title.textContent = title;
            this.subElements.body.textContent = body;
            return false;
        }
        this.update({
            title,
            body,
            color
        });
        return true;
    }
    shake() {
        this.element.classList.add("shake");
        this.element.addEventListener("animationend", () => this.element.classList.remove("shake"));
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
        if (!color.startsWith("#"))
            throw new Error("Color must be in hex format");
        this.element.style.setProperty("--bg-color", color);
        this.subElements.color.value = color;
    }
    // -------------------- Getters --------------------
    get options() {
        // we need to make sure we save the date in the great format... Ugly!
        return { ...this._options, ...{ date: this._options.date.toLocaleString() } };
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
// Handle the inputs on the options bar
[opts.inputTitle, opts.inputBody].forEach(input => input.addEventListener("keyup", (event) => {
    if (event.key != "Enter")
        return;
    const title = opts.inputTitle.value.trim();
    if (!addTodo({
        title,
        body: opts.inputBody.value,
        color: opts.inputColor.value,
        date: new Date()
    })) {
        // insertion failed, so we play a "pulse" animation
        optionsBar.classList.add("error");
        optionsBar.addEventListener("animationend", () => optionsBar.classList.remove("error"));
        return;
    }
    // insertion succeeded, so we reset the inputs and scroll up
    scrollTo(0, 0);
    [opts.inputTitle, opts.inputBody].forEach(e => e.value = "");
    saveTodos();
}));
// Remove all the selected todos
opts.delButton.addEventListener("click", () => {
    currentTodos.filter(t => t.isSelected).forEach(t => t.remove());
    saveTodos();
});
// Toggle the selected class of all the todos
opts.allButton.addEventListener("click", () => {
    // if we have more than 25 todos, just dont do any fancy delaying
    if (currentTodos.length > 25) {
        currentTodos.forEach(t => t.toggleSelect());
        return;
    }
    currentTodos.reverse().forEach((todo, i) => setTimeout(() => todo.toggleSelect(), i * (250 / currentTodos.length)));
});
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
// Insert the todos from the local storage
getTodos().forEach(options => addTodo(options));
saveTodos();
// If we have no todos, add the default one
if (!currentTodos.length) {
    addTodo({
        title: "Another note",
        body: `Adding a todo is simple! Just type the contents up there and press enter.
		Editing them? Even easier! Just double click on any todo to enable the edit mode.
		Once finished, double click again!`,
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