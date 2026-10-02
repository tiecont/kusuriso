import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
const storagePath = resolve(process.cwd(), 'data', 'todos.json');
async function readTodos() {
    try {
        const data = await readFile(storagePath, 'utf8');
        return JSON.parse(data);
    }
    catch (error) {
        if (error.code !== 'ENOENT') {
            throw error;
        }
        await mkdir(dirname(storagePath), { recursive: true });
        await writeFile(storagePath, '[]\n', 'utf8');
        return [];
    }
}
async function writeTodos(todos) {
    await mkdir(dirname(storagePath), { recursive: true });
    await writeFile(storagePath, `${JSON.stringify(todos, null, 2)}\n`, 'utf8');
}
export async function getTodos() {
    const todos = await readTodos();
    return todos.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}
export async function getTodo(id) {
    const todos = await readTodos();
    return todos.find((todo) => todo.id === id);
}
export async function createTodo(title, notes) {
    const todos = await readTodos();
    const now = new Date().toISOString();
    const todo = {
        id: randomUUID(),
        title,
        notes,
        completed: false,
        createdAt: now,
        updatedAt: now,
    };
    todos.push(todo);
    await writeTodos(todos);
    return todo;
}
export async function updateTodo(id, title, notes) {
    const todos = await readTodos();
    const todo = todos.find((item) => item.id === id);
    if (!todo) {
        return undefined;
    }
    todo.title = title;
    todo.notes = notes;
    todo.updatedAt = new Date().toISOString();
    await writeTodos(todos);
    return todo;
}
export async function toggleTodo(id) {
    const todos = await readTodos();
    const todo = todos.find((item) => item.id === id);
    if (!todo) {
        return undefined;
    }
    todo.completed = !todo.completed;
    todo.updatedAt = new Date().toISOString();
    await writeTodos(todos);
    return todo;
}
export async function deleteTodo(id) {
    const todos = await readTodos();
    const remainingTodos = todos.filter((todo) => todo.id !== id);
    if (remainingTodos.length === todos.length) {
        return false;
    }
    await writeTodos(remainingTodos);
    return true;
}
