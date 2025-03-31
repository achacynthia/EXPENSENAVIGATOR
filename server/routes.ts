import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { 
  insertExpenseSchema, legacyInsertExpenseSchema, 
  insertIncomeSchema, insertBudgetSchema, insertBudgetAllocationSchema,
  insertExpenseCategorySchema, insertExpenseSubcategorySchema,
  insertIncomeCategorySchema, insertIncomeSubcategorySchema
} from "@shared/schema";
import { z } from "zod";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";

// Helper for checking authentication
const requireAuth = (req: Request, res: Response, next: Function) => {
  if (!req.isAuthenticated()) {
    return res.sendStatus(401);
  }
  next();
};

// Helper for checking admin role
const requireAdmin = async (req: Request, res: Response, next: Function) => {
  if (!req.isAuthenticated()) {
    return res.sendStatus(401);
  }
  
  const userRole = await storage.getUserRole(req.user.id);
  if (userRole !== 'admin') {
    return res.status(403).json({ message: "Access denied" });
  }
  
  next();
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication routes
  setupAuth(app);

  // -------------------------------------------------------------------------
  // Expense Category Routes
  // -------------------------------------------------------------------------
  app.get("/api/expense-categories", requireAuth, async (req, res) => {
    try {
      const categories = await storage.getExpenseCategories(req.user.id);
      res.json(categories);
    } catch (error) {
      console.error("Error fetching expense categories:", error);
      res.status(500).json({ message: "Failed to fetch expense categories" });
    }
  });
  
  app.post("/api/expense-categories", requireAuth, async (req, res) => {
    try {
      const categoryData = insertExpenseCategorySchema.parse(req.body);
      const category = await storage.createExpenseCategory(req.user.id, categoryData);
      res.status(201).json(category);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        res.status(400).json({ message: validationError.message });
      } else {
        console.error("Error creating expense category:", error);
        res.status(500).json({ message: "Failed to create expense category" });
      }
    }
  });
  
  app.patch("/api/expense-categories/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const category = await storage.getExpenseCategoryById(id);
      
      if (!category) {
        return res.status(404).json({ message: "Category not found" });
      }
      
      if (category.userId !== req.user.id) {
        return res.status(403).json({ message: "You don't have permission to update this category" });
      }
      
      const categoryData = insertExpenseCategorySchema.parse(req.body);
      const updatedCategory = await storage.updateExpenseCategory(id, categoryData);
      
      res.json(updatedCategory);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        res.status(400).json({ message: validationError.message });
      } else {
        console.error("Error updating expense category:", error);
        res.status(500).json({ message: "Failed to update expense category" });
      }
    }
  });
  
  app.delete("/api/expense-categories/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const category = await storage.getExpenseCategoryById(id);
      
      if (!category) {
        return res.status(404).json({ message: "Category not found" });
      }
      
      if (category.userId !== req.user.id) {
        return res.status(403).json({ message: "You don't have permission to delete this category" });
      }
      
      await storage.deleteExpenseCategory(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting expense category:", error);
      res.status(500).json({ message: "Failed to delete expense category", error: error.message });
    }
  });
  
  // -------------------------------------------------------------------------
  // Expense Subcategory Routes
  // -------------------------------------------------------------------------
  app.get("/api/expense-categories/:categoryId/subcategories", requireAuth, async (req, res) => {
    try {
      const categoryId = parseInt(req.params.categoryId);
      const category = await storage.getExpenseCategoryById(categoryId);
      
      if (!category) {
        return res.status(404).json({ message: "Category not found" });
      }
      
      if (category.userId !== req.user.id) {
        return res.status(403).json({ message: "You don't have permission to access this category" });
      }
      
      const subcategories = await storage.getExpenseSubcategories(categoryId);
      res.json(subcategories);
    } catch (error) {
      console.error("Error fetching expense subcategories:", error);
      res.status(500).json({ message: "Failed to fetch expense subcategories" });
    }
  });
  
  app.post("/api/expense-subcategories", requireAuth, async (req, res) => {
    try {
      const subcategoryData = insertExpenseSubcategorySchema.parse(req.body);
      
      // Verify the category belongs to the user
      const category = await storage.getExpenseCategoryById(subcategoryData.categoryId);
      if (!category || category.userId !== req.user.id) {
        return res.status(403).json({ message: "Invalid category" });
      }
      
      const subcategory = await storage.createExpenseSubcategory(req.user.id, subcategoryData);
      res.status(201).json(subcategory);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        res.status(400).json({ message: validationError.message });
      } else {
        console.error("Error creating expense subcategory:", error);
        res.status(500).json({ message: "Failed to create expense subcategory" });
      }
    }
  });
  
  app.patch("/api/expense-subcategories/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const subcategory = await storage.getExpenseSubcategoryById(id);
      
      if (!subcategory) {
        return res.status(404).json({ message: "Subcategory not found" });
      }
      
      if (subcategory.userId !== req.user.id) {
        return res.status(403).json({ message: "You don't have permission to update this subcategory" });
      }
      
      const subcategoryData = insertExpenseSubcategorySchema.parse(req.body);
      
      // Verify the category belongs to the user
      const category = await storage.getExpenseCategoryById(subcategoryData.categoryId);
      if (!category || category.userId !== req.user.id) {
        return res.status(403).json({ message: "Invalid category" });
      }
      
      const updatedSubcategory = await storage.updateExpenseSubcategory(id, subcategoryData);
      
      res.json(updatedSubcategory);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        res.status(400).json({ message: validationError.message });
      } else {
        console.error("Error updating expense subcategory:", error);
        res.status(500).json({ message: "Failed to update expense subcategory" });
      }
    }
  });
  
  app.delete("/api/expense-subcategories/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const subcategory = await storage.getExpenseSubcategoryById(id);
      
      if (!subcategory) {
        return res.status(404).json({ message: "Subcategory not found" });
      }
      
      if (subcategory.userId !== req.user.id) {
        return res.status(403).json({ message: "You don't have permission to delete this subcategory" });
      }
      
      await storage.deleteExpenseSubcategory(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting expense subcategory:", error);
      res.status(500).json({ message: "Failed to delete expense subcategory", error: error.message });
    }
  });
  
  // -------------------------------------------------------------------------
  // Income Category Routes
  // -------------------------------------------------------------------------
  app.get("/api/income-categories", requireAuth, async (req, res) => {
    try {
      const categories = await storage.getIncomeCategories(req.user.id);
      res.json(categories);
    } catch (error) {
      console.error("Error fetching income categories:", error);
      res.status(500).json({ message: "Failed to fetch income categories" });
    }
  });
  
  app.post("/api/income-categories", requireAuth, async (req, res) => {
    try {
      const categoryData = insertIncomeCategorySchema.parse(req.body);
      const category = await storage.createIncomeCategory(req.user.id, categoryData);
      res.status(201).json(category);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        res.status(400).json({ message: validationError.message });
      } else {
        console.error("Error creating income category:", error);
        res.status(500).json({ message: "Failed to create income category" });
      }
    }
  });
  
  app.patch("/api/income-categories/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const category = await storage.getIncomeCategoryById(id);
      
      if (!category) {
        return res.status(404).json({ message: "Category not found" });
      }
      
      if (category.userId !== req.user.id) {
        return res.status(403).json({ message: "You don't have permission to update this category" });
      }
      
      const categoryData = insertIncomeCategorySchema.parse(req.body);
      const updatedCategory = await storage.updateIncomeCategory(id, categoryData);
      
      res.json(updatedCategory);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        res.status(400).json({ message: validationError.message });
      } else {
        console.error("Error updating income category:", error);
        res.status(500).json({ message: "Failed to update income category" });
      }
    }
  });
  
  app.delete("/api/income-categories/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const category = await storage.getIncomeCategoryById(id);
      
      if (!category) {
        return res.status(404).json({ message: "Category not found" });
      }
      
      if (category.userId !== req.user.id) {
        return res.status(403).json({ message: "You don't have permission to delete this category" });
      }
      
      await storage.deleteIncomeCategory(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting income category:", error);
      res.status(500).json({ message: "Failed to delete income category", error: error.message });
    }
  });
  
  // -------------------------------------------------------------------------
  // Income Subcategory Routes
  // -------------------------------------------------------------------------
  app.get("/api/income-categories/:categoryId/subcategories", requireAuth, async (req, res) => {
    try {
      const categoryId = parseInt(req.params.categoryId);
      const category = await storage.getIncomeCategoryById(categoryId);
      
      if (!category) {
        return res.status(404).json({ message: "Category not found" });
      }
      
      if (category.userId !== req.user.id) {
        return res.status(403).json({ message: "You don't have permission to access this category" });
      }
      
      const subcategories = await storage.getIncomeSubcategories(categoryId);
      res.json(subcategories);
    } catch (error) {
      console.error("Error fetching income subcategories:", error);
      res.status(500).json({ message: "Failed to fetch income subcategories" });
    }
  });
  
  app.post("/api/income-subcategories", requireAuth, async (req, res) => {
    try {
      const subcategoryData = insertIncomeSubcategorySchema.parse(req.body);
      
      // Verify the category belongs to the user
      const category = await storage.getIncomeCategoryById(subcategoryData.categoryId);
      if (!category || category.userId !== req.user.id) {
        return res.status(403).json({ message: "Invalid category" });
      }
      
      const subcategory = await storage.createIncomeSubcategory(req.user.id, subcategoryData);
      res.status(201).json(subcategory);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        res.status(400).json({ message: validationError.message });
      } else {
        console.error("Error creating income subcategory:", error);
        res.status(500).json({ message: "Failed to create income subcategory" });
      }
    }
  });
  
  app.patch("/api/income-subcategories/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const subcategory = await storage.getIncomeSubcategoryById(id);
      
      if (!subcategory) {
        return res.status(404).json({ message: "Subcategory not found" });
      }
      
      if (subcategory.userId !== req.user.id) {
        return res.status(403).json({ message: "You don't have permission to update this subcategory" });
      }
      
      const subcategoryData = insertIncomeSubcategorySchema.parse(req.body);
      
      // Verify the category belongs to the user
      const category = await storage.getIncomeCategoryById(subcategoryData.categoryId);
      if (!category || category.userId !== req.user.id) {
        return res.status(403).json({ message: "Invalid category" });
      }
      
      const updatedSubcategory = await storage.updateIncomeSubcategory(id, subcategoryData);
      
      res.json(updatedSubcategory);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        res.status(400).json({ message: validationError.message });
      } else {
        console.error("Error updating income subcategory:", error);
        res.status(500).json({ message: "Failed to update income subcategory" });
      }
    }
  });
  
  app.delete("/api/income-subcategories/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const subcategory = await storage.getIncomeSubcategoryById(id);
      
      if (!subcategory) {
        return res.status(404).json({ message: "Subcategory not found" });
      }
      
      if (subcategory.userId !== req.user.id) {
        return res.status(403).json({ message: "You don't have permission to delete this subcategory" });
      }
      
      await storage.deleteIncomeSubcategory(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting income subcategory:", error);
      res.status(500).json({ message: "Failed to delete income subcategory", error: error.message });
    }
  });
  
  // -------------------------------------------------------------------------
  // Expense Routes
  // -------------------------------------------------------------------------
  app.get("/api/expenses", requireAuth, async (req, res) => {
    try {
      const expenses = await storage.getExpensesByUserId(req.user.id);
      
      // Augment each expense with category and subcategory names
      const augmentedExpenses = await Promise.all(expenses.map(async (expense) => {
        const category = await storage.getExpenseCategoryById(expense.categoryId);
        
        let subcategory = null;
        if (expense.subcategoryId) {
          subcategory = await storage.getExpenseSubcategoryById(expense.subcategoryId);
        }
        
        return {
          ...expense,
          categoryName: category?.name || 'Unknown',
          subcategoryName: subcategory?.name || null
        };
      }));
      
      res.json(augmentedExpenses);
    } catch (error) {
      console.error("Error fetching expenses:", error);
      res.status(500).json({ message: "Failed to fetch expenses" });
    }
  });

  app.post("/api/expenses", requireAuth, async (req, res) => {
    try {
      // Ensure date is properly parsed, especially if it came as an ISO string
      const data = req.body;
      if (data.date && typeof data.date === 'string') {
        data.date = new Date(data.date);
      }
      
      // Check if we're using legacy or new schema
      let expense;
      
      if ('category' in data) {
        // Legacy mode (string category)
        const expenseData = legacyInsertExpenseSchema.parse(data);
        expense = await storage.createLegacyExpense({
          ...expenseData,
          userId: req.user.id
        });
      } else {
        // New mode (category ID)
        const expenseData = insertExpenseSchema.parse(data);
        
        // Verify the category belongs to the user
        const category = await storage.getExpenseCategoryById(expenseData.categoryId);
        if (!category || category.userId !== req.user.id) {
          return res.status(403).json({ message: "Invalid category" });
        }
        
        // If subcategory is provided, verify it belongs to the category
        if (expenseData.subcategoryId) {
          const subcategory = await storage.getExpenseSubcategoryById(expenseData.subcategoryId);
          if (!subcategory || subcategory.categoryId !== expenseData.categoryId) {
            return res.status(403).json({ message: "Invalid subcategory" });
          }
        }
        
        expense = await storage.createExpense({
          ...expenseData,
          userId: req.user.id
        });
      }
      
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

  app.get("/api/expenses/:id", requireAuth, async (req, res) => {
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

  app.patch("/api/expenses/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const expense = await storage.getExpenseById(id);
      
      if (!expense) {
        return res.status(404).json({ message: "Expense not found" });
      }
      
      if (expense.userId !== req.user.id) {
        return res.status(403).json({ message: "You don't have permission to update this expense" });
      }
      
      // Ensure date is properly parsed, especially if it came as an ISO string
      const data = req.body;
      if (data.date && typeof data.date === 'string') {
        data.date = new Date(data.date);
      }
      
      // Check if we're using legacy or new schema
      let updatedExpense;
      
      if ('category' in data) {
        // Legacy mode (string category)
        const expenseData = legacyInsertExpenseSchema.parse(data);
        updatedExpense = await storage.updateLegacyExpense(id, {
          ...expenseData,
          userId: req.user.id
        });
      } else {
        // New mode (category ID)
        const expenseData = insertExpenseSchema.parse(data);
        
        // Verify the category belongs to the user
        const category = await storage.getExpenseCategoryById(expenseData.categoryId);
        if (!category || category.userId !== req.user.id) {
          return res.status(403).json({ message: "Invalid category" });
        }
        
        // If subcategory is provided, verify it belongs to the category
        if (expenseData.subcategoryId) {
          const subcategory = await storage.getExpenseSubcategoryById(expenseData.subcategoryId);
          if (!subcategory || subcategory.categoryId !== expenseData.categoryId) {
            return res.status(403).json({ message: "Invalid subcategory" });
          }
        }
        
        updatedExpense = await storage.updateExpense(id, {
          ...expenseData,
          userId: req.user.id
        });
      }
      
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

  app.delete("/api/expenses/:id", requireAuth, async (req, res) => {
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
  
  // -------------------------------------------------------------------------
  // Income Routes
  // -------------------------------------------------------------------------
  app.get("/api/incomes", requireAuth, async (req, res) => {
    try {
      const incomes = await storage.getIncomesByUserId(req.user.id);
      
      // Augment each income with category and subcategory names
      const augmentedIncomes = await Promise.all(incomes.map(async (income) => {
        const category = await storage.getIncomeCategoryById(income.categoryId);
        
        let subcategory = null;
        if (income.subcategoryId) {
          subcategory = await storage.getIncomeSubcategoryById(income.subcategoryId);
        }
        
        return {
          ...income,
          categoryName: category?.name || 'Unknown',
          subcategoryName: subcategory?.name || null
        };
      }));
      
      res.json(augmentedIncomes);
    } catch (error) {
      console.error("Error fetching incomes:", error);
      res.status(500).json({ message: "Failed to fetch incomes" });
    }
  });

  app.post("/api/incomes", requireAuth, async (req, res) => {
    try {
      // Ensure date is properly parsed, especially if it came as an ISO string
      const data = req.body;
      if (data.date && typeof data.date === 'string') {
        data.date = new Date(data.date);
      }
      
      const incomeData = insertIncomeSchema.parse(data);
      
      // Verify the category belongs to the user
      const category = await storage.getIncomeCategoryById(incomeData.categoryId);
      if (!category || category.userId !== req.user.id) {
        return res.status(403).json({ message: "Invalid category" });
      }
      
      // If subcategory is provided, verify it belongs to the category
      if (incomeData.subcategoryId) {
        const subcategory = await storage.getIncomeSubcategoryById(incomeData.subcategoryId);
        if (!subcategory || subcategory.categoryId !== incomeData.categoryId) {
          return res.status(403).json({ message: "Invalid subcategory" });
        }
      }
      
      const income = await storage.createIncome({
        ...incomeData,
        userId: req.user.id
      });
      
      res.status(201).json(income);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        res.status(400).json({ message: validationError.message });
      } else {
        console.error("Error creating income:", error);
        res.status(500).json({ message: "Failed to create income" });
      }
    }
  });

  app.get("/api/incomes/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const income = await storage.getIncomeById(id);
      
      if (!income) {
        return res.status(404).json({ message: "Income not found" });
      }
      
      if (income.userId !== req.user.id) {
        return res.status(403).json({ message: "You don't have permission to access this income" });
      }
      
      res.json(income);
    } catch (error) {
      console.error("Error fetching income:", error);
      res.status(500).json({ message: "Failed to fetch income" });
    }
  });

  app.patch("/api/incomes/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const income = await storage.getIncomeById(id);
      
      if (!income) {
        return res.status(404).json({ message: "Income not found" });
      }
      
      if (income.userId !== req.user.id) {
        return res.status(403).json({ message: "You don't have permission to update this income" });
      }
      
      // Ensure date is properly parsed, especially if it came as an ISO string
      const data = req.body;
      if (data.date && typeof data.date === 'string') {
        data.date = new Date(data.date);
      }
      
      const incomeData = insertIncomeSchema.parse(data);
      
      // Verify the category belongs to the user
      const category = await storage.getIncomeCategoryById(incomeData.categoryId);
      if (!category || category.userId !== req.user.id) {
        return res.status(403).json({ message: "Invalid category" });
      }
      
      // If subcategory is provided, verify it belongs to the category
      if (incomeData.subcategoryId) {
        const subcategory = await storage.getIncomeSubcategoryById(incomeData.subcategoryId);
        if (!subcategory || subcategory.categoryId !== incomeData.categoryId) {
          return res.status(403).json({ message: "Invalid subcategory" });
        }
      }
      
      const updatedIncome = await storage.updateIncome(id, {
        ...incomeData,
        userId: req.user.id
      });
      
      res.json(updatedIncome);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        res.status(400).json({ message: validationError.message });
      } else {
        console.error("Error updating income:", error);
        res.status(500).json({ message: "Failed to update income" });
      }
    }
  });

  app.delete("/api/incomes/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const income = await storage.getIncomeById(id);
      
      if (!income) {
        return res.status(404).json({ message: "Income not found" });
      }
      
      if (income.userId !== req.user.id) {
        return res.status(403).json({ message: "You don't have permission to delete this income" });
      }
      
      await storage.deleteIncome(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting income:", error);
      res.status(500).json({ message: "Failed to delete income" });
    }
  });
  
  // -------------------------------------------------------------------------
  // Budget Routes
  // -------------------------------------------------------------------------
  app.get("/api/budgets", requireAuth, async (req, res) => {
    try {
      const budgets = await storage.getBudgetsByUserId(req.user.id);
      res.json(budgets);
    } catch (error) {
      console.error("Error fetching budgets:", error);
      res.status(500).json({ message: "Failed to fetch budgets" });
    }
  });

  app.post("/api/budgets", requireAuth, async (req, res) => {
    try {
      // Ensure dates are properly parsed, especially if they came as ISO strings
      const data = req.body;
      if (data.startDate && typeof data.startDate === 'string') {
        data.startDate = new Date(data.startDate);
      }
      if (data.endDate && typeof data.endDate === 'string') {
        data.endDate = new Date(data.endDate);
      }
      
      const budgetData = insertBudgetSchema.parse(data);
      const budget = await storage.createBudget({
        ...budgetData,
        userId: req.user.id
      });
      
      res.status(201).json(budget);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        res.status(400).json({ message: validationError.message });
      } else {
        console.error("Error creating budget:", error);
        res.status(500).json({ message: "Failed to create budget" });
      }
    }
  });

  app.get("/api/budgets/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const budget = await storage.getBudgetById(id);
      
      if (!budget) {
        return res.status(404).json({ message: "Budget not found" });
      }
      
      if (budget.userId !== req.user.id) {
        return res.status(403).json({ message: "You don't have permission to access this budget" });
      }
      
      // Get all budget allocations as well
      const allocations = await storage.getBudgetAllocations(id);
      
      // Get budget performance
      const performance = await storage.getBudgetPerformance(id);
      
      res.json({
        budget,
        allocations,
        performance
      });
    } catch (error) {
      console.error("Error fetching budget:", error);
      res.status(500).json({ message: "Failed to fetch budget" });
    }
  });

  app.patch("/api/budgets/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const budget = await storage.getBudgetById(id);
      
      if (!budget) {
        return res.status(404).json({ message: "Budget not found" });
      }
      
      if (budget.userId !== req.user.id) {
        return res.status(403).json({ message: "You don't have permission to update this budget" });
      }
      
      // Ensure dates are properly parsed, especially if they came as ISO strings
      const data = req.body;
      if (data.startDate && typeof data.startDate === 'string') {
        data.startDate = new Date(data.startDate);
      }
      if (data.endDate && typeof data.endDate === 'string') {
        data.endDate = new Date(data.endDate);
      }
      
      const budgetData = insertBudgetSchema.parse(data);
      const updatedBudget = await storage.updateBudget(id, budgetData);
      
      res.json(updatedBudget);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        res.status(400).json({ message: validationError.message });
      } else {
        console.error("Error updating budget:", error);
        res.status(500).json({ message: "Failed to update budget" });
      }
    }
  });

  app.delete("/api/budgets/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const budget = await storage.getBudgetById(id);
      
      if (!budget) {
        return res.status(404).json({ message: "Budget not found" });
      }
      
      if (budget.userId !== req.user.id) {
        return res.status(403).json({ message: "You don't have permission to delete this budget" });
      }
      
      await storage.deleteBudget(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting budget:", error);
      res.status(500).json({ message: "Failed to delete budget" });
    }
  });
  
  // -------------------------------------------------------------------------
  // Budget Allocation Routes
  // -------------------------------------------------------------------------
  app.get("/api/budgets/:budgetId/allocations", requireAuth, async (req, res) => {
    try {
      const budgetId = parseInt(req.params.budgetId);
      const budget = await storage.getBudgetById(budgetId);
      
      if (!budget) {
        return res.status(404).json({ message: "Budget not found" });
      }
      
      if (budget.userId !== req.user.id) {
        return res.status(403).json({ message: "You don't have permission to access this budget" });
      }
      
      const allocations = await storage.getBudgetAllocations(budgetId);
      res.json(allocations);
    } catch (error) {
      console.error("Error fetching budget allocations:", error);
      res.status(500).json({ message: "Failed to fetch budget allocations" });
    }
  });

  app.post("/api/budget-allocations", requireAuth, async (req, res) => {
    try {
      const allocationData = insertBudgetAllocationSchema.parse(req.body);
      
      // Verify the budget belongs to the user
      const budget = await storage.getBudgetById(allocationData.budgetId);
      if (!budget || budget.userId !== req.user.id) {
        return res.status(403).json({ message: "Invalid budget" });
      }
      
      // Verify the category belongs to the user
      const category = await storage.getExpenseCategoryById(allocationData.categoryId);
      if (!category || category.userId !== req.user.id) {
        return res.status(403).json({ message: "Invalid category" });
      }
      
      // If subcategory is provided, verify it belongs to the category
      if (allocationData.subcategoryId) {
        const subcategory = await storage.getExpenseSubcategoryById(allocationData.subcategoryId);
        if (!subcategory || subcategory.categoryId !== allocationData.categoryId) {
          return res.status(403).json({ message: "Invalid subcategory" });
        }
      }
      
      const allocation = await storage.createBudgetAllocation(allocationData);
      res.status(201).json(allocation);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        res.status(400).json({ message: validationError.message });
      } else {
        console.error("Error creating budget allocation:", error);
        res.status(500).json({ message: "Failed to create budget allocation" });
      }
    }
  });

  app.patch("/api/budget-allocations/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const allocationData = insertBudgetAllocationSchema.parse(req.body);
      
      // Verify the budget belongs to the user
      const budget = await storage.getBudgetById(allocationData.budgetId);
      if (!budget || budget.userId !== req.user.id) {
        return res.status(403).json({ message: "Invalid budget" });
      }
      
      // Verify the category belongs to the user
      const category = await storage.getExpenseCategoryById(allocationData.categoryId);
      if (!category || category.userId !== req.user.id) {
        return res.status(403).json({ message: "Invalid category" });
      }
      
      // If subcategory is provided, verify it belongs to the category
      if (allocationData.subcategoryId) {
        const subcategory = await storage.getExpenseSubcategoryById(allocationData.subcategoryId);
        if (!subcategory || subcategory.categoryId !== allocationData.categoryId) {
          return res.status(403).json({ message: "Invalid subcategory" });
        }
      }
      
      const updatedAllocation = await storage.updateBudgetAllocation(id, allocationData);
      res.json(updatedAllocation);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        res.status(400).json({ message: validationError.message });
      } else {
        console.error("Error updating budget allocation:", error);
        res.status(500).json({ message: "Failed to update budget allocation" });
      }
    }
  });

  app.delete("/api/budget-allocations/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteBudgetAllocation(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting budget allocation:", error);
      res.status(500).json({ message: "Failed to delete budget allocation" });
    }
  });
  
  // -------------------------------------------------------------------------
  // Reports and Analytics Routes
  // -------------------------------------------------------------------------
  app.get("/api/reports/monthly-expenses/:year", requireAuth, async (req, res) => {
    try {
      const year = parseInt(req.params.year);
      const monthlyExpenses = await storage.getMonthlyExpenseTotals(req.user.id, year);
      res.json(monthlyExpenses);
    } catch (error) {
      console.error("Error fetching monthly expense report:", error);
      res.status(500).json({ message: "Failed to fetch monthly expense report" });
    }
  });
  
  app.get("/api/reports/category-expenses", requireAuth, async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ message: "Start date and end date are required" });
      }
      
      const start = new Date(startDate as string);
      const end = new Date(endDate as string);
      
      const categoryExpenses = await storage.getCategoryExpenseTotals(req.user.id, start, end);
      res.json(categoryExpenses);
    } catch (error) {
      console.error("Error fetching category expense report:", error);
      res.status(500).json({ message: "Failed to fetch category expense report" });
    }
  });
  
  app.get("/api/reports/monthly-incomes/:year", requireAuth, async (req, res) => {
    try {
      const year = parseInt(req.params.year);
      const monthlyIncomes = await storage.getMonthlyIncomeTotals(req.user.id, year);
      res.json(monthlyIncomes);
    } catch (error) {
      console.error("Error fetching monthly income report:", error);
      res.status(500).json({ message: "Failed to fetch monthly income report" });
    }
  });
  
  app.get("/api/reports/category-incomes", requireAuth, async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ message: "Start date and end date are required" });
      }
      
      const start = new Date(startDate as string);
      const end = new Date(endDate as string);
      
      const categoryIncomes = await storage.getCategoryIncomeTotals(req.user.id, start, end);
      res.json(categoryIncomes);
    } catch (error) {
      console.error("Error fetching category income report:", error);
      res.status(500).json({ message: "Failed to fetch category income report" });
    }
  });
  
  app.get("/api/reports/budget-performance/:budgetId", requireAuth, async (req, res) => {
    try {
      const budgetId = parseInt(req.params.budgetId);
      
      // Verify the budget belongs to the user
      const budget = await storage.getBudgetById(budgetId);
      if (!budget || budget.userId !== req.user.id) {
        return res.status(403).json({ message: "Invalid budget" });
      }
      
      const performance = await storage.getBudgetPerformance(budgetId);
      res.json(performance);
    } catch (error) {
      console.error("Error fetching budget performance:", error);
      res.status(500).json({ message: "Failed to fetch budget performance" });
    }
  });
  
  // -------------------------------------------------------------------------
  // User settings routes
  // -------------------------------------------------------------------------
  app.patch("/api/user/settings", requireAuth, async (req, res) => {
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
  
  // -------------------------------------------------------------------------
  // Admin routes
  // -------------------------------------------------------------------------
  app.get("/api/admin/users", requireAdmin, async (req, res) => {
    try {
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
  
  app.get("/api/admin/expenses", requireAdmin, async (req, res) => {
    try {
      const expenses = await storage.getAllExpenses();
      res.json(expenses);
    } catch (error) {
      console.error("Error fetching all expenses:", error);
      res.status(500).json({ message: "Failed to fetch expenses" });
    }
  });
  
  app.get("/api/admin/incomes", requireAdmin, async (req, res) => {
    try {
      const incomes = await storage.getAllIncomes();
      res.json(incomes);
    } catch (error) {
      console.error("Error fetching all incomes:", error);
      res.status(500).json({ message: "Failed to fetch incomes" });
    }
  });
  
  app.patch("/api/admin/users/:id/role", requireAdmin, async (req, res) => {
    try {
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
