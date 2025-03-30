import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { insertExpenseSchema } from "@shared/schema";
import { z } from "zod";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication routes
  setupAuth(app);

  // Expense routes
  app.get("/api/expenses", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const expenses = await storage.getExpensesByUserId(req.user.id);
      res.json(expenses);
    } catch (error) {
      console.error("Error fetching expenses:", error);
      res.status(500).json({ message: "Failed to fetch expenses" });
    }
  });

  app.post("/api/expenses", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const expenseData = insertExpenseSchema.parse(req.body);
      const expense = await storage.createExpense({
        ...expenseData,
        userId: req.user.id
      });
      res.status(201).json(expense);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        res.status(400).json({ message: validationError.message });
      } else {
        console.error("Error creating expense:", error);
        res.status(500).json({ message: "Failed to create expense" });
      }
    }
  });

  app.get("/api/expenses/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const id = parseInt(req.params.id);
      const expense = await storage.getExpenseById(id);
      
      if (!expense) {
        return res.status(404).json({ message: "Expense not found" });
      }
      
      if (expense.userId !== req.user.id) {
        return res.status(403).json({ message: "You don't have permission to access this expense" });
      }
      
      res.json(expense);
    } catch (error) {
      console.error("Error fetching expense:", error);
      res.status(500).json({ message: "Failed to fetch expense" });
    }
  });

  app.patch("/api/expenses/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const id = parseInt(req.params.id);
      const expense = await storage.getExpenseById(id);
      
      if (!expense) {
        return res.status(404).json({ message: "Expense not found" });
      }
      
      if (expense.userId !== req.user.id) {
        return res.status(403).json({ message: "You don't have permission to update this expense" });
      }
      
      const expenseData = insertExpenseSchema.parse(req.body);
      const updatedExpense = await storage.updateExpense(id, {
        ...expenseData,
        userId: req.user.id
      });
      
      res.json(updatedExpense);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        res.status(400).json({ message: validationError.message });
      } else {
        console.error("Error updating expense:", error);
        res.status(500).json({ message: "Failed to update expense" });
      }
    }
  });

  app.delete("/api/expenses/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const id = parseInt(req.params.id);
      const expense = await storage.getExpenseById(id);
      
      if (!expense) {
        return res.status(404).json({ message: "Expense not found" });
      }
      
      if (expense.userId !== req.user.id) {
        return res.status(403).json({ message: "You don't have permission to delete this expense" });
      }
      
      await storage.deleteExpense(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting expense:", error);
      res.status(500).json({ message: "Failed to delete expense" });
    }
  });

  // User settings routes
  app.patch("/api/user/settings", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const { currency } = req.body;
      
      const updatedUser = await storage.updateUserSettings(req.user.id, { currency });
      const { password, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error updating user settings:", error);
      res.status(500).json({ message: "Failed to update user settings" });
    }
  });
  
  // Admin routes
  app.get("/api/admin/users", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const userRole = await storage.getUserRole(req.user.id);
      if (userRole !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const users = await storage.getAllUsers();
      // Remove passwords from response
      const safeUsers = users.map(({ password, ...user }) => ({
        ...user,
        role: storage.getUserRole(user.id)
      }));
      
      res.json(safeUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });
  
  app.get("/api/admin/expenses", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const userRole = await storage.getUserRole(req.user.id);
      if (userRole !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const expenses = await storage.getAllExpenses();
      res.json(expenses);
    } catch (error) {
      console.error("Error fetching all expenses:", error);
      res.status(500).json({ message: "Failed to fetch expenses" });
    }
  });
  
  app.patch("/api/admin/users/:id/role", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const userRole = await storage.getUserRole(req.user.id);
      if (userRole !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const userId = parseInt(req.params.id);
      const { role } = req.body;
      
      if (!role || !['admin', 'user'].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }
      
      await storage.setUserRole(userId, role);
      res.status(200).json({ message: "User role updated" });
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).json({ message: "Failed to update user role" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
