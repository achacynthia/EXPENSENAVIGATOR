import { users, type User, type InsertUser, expenses, type Expense, type InsertExpense } from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

// Storage interface
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Expense operations
  getExpensesByUserId(userId: number): Promise<Expense[]>;
  getExpenseById(id: number): Promise<Expense | undefined>;
  createExpense(expense: InsertExpense & { userId: number }): Promise<Expense>;
  updateExpense(id: number, expense: InsertExpense & { userId: number }): Promise<Expense>;
  deleteExpense(id: number): Promise<void>;

  // Session store
  sessionStore: session.SessionStore;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private expenses: Map<number, Expense>;
  private nextUserId: number;
  private nextExpenseId: number;
  sessionStore: session.SessionStore;

  constructor() {
    this.users = new Map();
    this.expenses = new Map();
    this.nextUserId = 1;
    this.nextExpenseId = 1;
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // prune expired entries every 24h
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.nextUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Expense methods
  async getExpensesByUserId(userId: number): Promise<Expense[]> {
    return Array.from(this.expenses.values()).filter(
      (expense) => expense.userId === userId
    );
  }

  async getExpenseById(id: number): Promise<Expense | undefined> {
    return this.expenses.get(id);
  }

  async createExpense(expenseData: InsertExpense & { userId: number }): Promise<Expense> {
    const id = this.nextExpenseId++;
    const expense: Expense = {
      ...expenseData,
      id,
      createdAt: new Date()
    };
    this.expenses.set(id, expense);
    return expense;
  }

  async updateExpense(id: number, expenseData: InsertExpense & { userId: number }): Promise<Expense> {
    const existingExpense = this.expenses.get(id);
    
    if (!existingExpense) {
      throw new Error(`Expense with id ${id} not found`);
    }
    
    const updatedExpense: Expense = {
      ...existingExpense,
      ...expenseData,
      id,
      createdAt: existingExpense.createdAt
    };
    
    this.expenses.set(id, updatedExpense);
    return updatedExpense;
  }

  async deleteExpense(id: number): Promise<void> {
    if (!this.expenses.has(id)) {
      throw new Error(`Expense with id ${id} not found`);
    }
    
    this.expenses.delete(id);
  }
}

export const storage = new MemStorage();
