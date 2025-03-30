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
  getAllUsers(): Promise<User[]>;
  getUserRole(userId: number): Promise<string>;
  setUserRole(userId: number, role: string): Promise<void>;
  updateUserSettings(userId: number, settings: { currency?: string }): Promise<User>;

  // Expense operations
  getExpensesByUserId(userId: number): Promise<Expense[]>;
  getExpenseById(id: number): Promise<Expense | undefined>;
  createExpense(expense: InsertExpense & { userId: number }): Promise<Expense>;
  updateExpense(id: number, expense: InsertExpense & { userId: number }): Promise<Expense>;
  deleteExpense(id: number): Promise<void>;
  getAllExpenses(): Promise<Expense[]>;

  // Session store
  sessionStore: session.Store;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private expenses: Map<number, Expense>;
  private nextUserId: number;
  private nextExpenseId: number;
  sessionStore: session.Store;
  private userRoles: Map<number, string>;

  constructor() {
    this.users = new Map();
    this.expenses = new Map();
    this.nextUserId = 1;
    this.nextExpenseId = 1;
    this.userRoles = new Map();
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // prune expired entries every 24h
    });
    
    // Create demo accounts if they don't exist
    this.createDemoAccounts();
  }
  
  // Helper method to create demo accounts
  private async createDemoAccounts() {
    // Create demo user if not exists
    const demoUser = await this.getUserByUsername('demo');
    if (!demoUser) {
      await this.createUser({
        username: 'demo',
        password: '6cf1f43a5e7c4ee6713d73af337877fe88248bc30ecb1abf7c7ca856bff007a8912fc93598e77ec3713592505f7eae6347942d2f95fa6bb25596ebcbff31c0a7.68997d0798d5677a', // 'password'
        name: 'Demo User',
        email: 'demo@example.com'
      });
      
      // Add some sample expenses for the demo user
      const date = new Date();
      
      await this.createExpense({
        userId: 1,
        amount: 25.99,
        description: 'Groceries',
        date: new Date(date.setDate(date.getDate() - 1)),
        category: 'Food',
        merchant: 'Supermarket',
        notes: 'Weekly shopping'
      });
      
      await this.createExpense({
        userId: 1,
        amount: 45.50,
        description: 'Gas',
        date: new Date(date.setDate(date.getDate() - 3)),
        category: 'Transportation',
        merchant: 'Gas Station',
        notes: null
      });
      
      await this.createExpense({
        userId: 1,
        amount: 12.99,
        description: 'Netflix subscription',
        date: new Date(date.setDate(date.getDate() - 5)),
        category: 'Entertainment',
        merchant: 'Netflix',
        notes: 'Monthly subscription'
      });
    }
    
    // Create admin user if not exists
    const adminUser = await this.getUserByUsername('admin');
    if (!adminUser) {
      await this.createUser({
        username: 'admin',
        password: '6cf1f43a5e7c4ee6713d73af337877fe88248bc30ecb1abf7c7ca856bff007a8912fc93598e77ec3713592505f7eae6347942d2f95fa6bb25596ebcbff31c0a7.68997d0798d5677a', // 'password'
        name: 'Admin User',
        email: 'admin@example.com'
      });
    }
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
    
    // Determine role based on ID (admin for ID 2)
    const role = id === 2 ? 'admin' : 'user';
    
    const user: User = { 
      ...insertUser, 
      id,
      currency: 'USD',
      role
    };
    
    this.users.set(id, user);
    this.userRoles.set(id, role);
    
    return user;
  }
  
  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }
  
  async getUserRole(userId: number): Promise<string> {
    return this.userRoles.get(userId) || 'user';
  }
  
  async setUserRole(userId: number, role: string): Promise<void> {
    this.userRoles.set(userId, role);
  }
  
  async updateUserSettings(userId: number, settings: { currency?: string }): Promise<User> {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error(`User with id ${userId} not found`);
    }
    
    const updatedUser = {
      ...user,
      currency: settings.currency || user.currency || 'USD'
    };
    
    this.users.set(userId, updatedUser);
    return updatedUser;
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
      createdAt: new Date(),
      merchant: expenseData.merchant || null,
      notes: expenseData.notes || null
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
      createdAt: existingExpense.createdAt,
      merchant: expenseData.merchant || null,
      notes: expenseData.notes || null
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
  
  async getAllExpenses(): Promise<Expense[]> {
    return Array.from(this.expenses.values());
  }
}

export const storage = new MemStorage();
