import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db, UdharCustomer, UdharTransaction } from '../../database/db.js';
import { authMiddleware, AuthenticatedRequest } from '../../middleware/auth.middleware.js';
import { ActivityService } from '../activity/activity.service.js';
import { getSupabase, isSupabaseConnected, supabaseService } from '../../database/supabase.js';

export const udharRouter = Router();

// 1. Overall Udhar Summary & Statistics
udharRouter.get('/summary', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    let customers = db.udharCustomers.filter((c) => c.userId === userId);
    let transactions = db.udharTransactions.filter((t) => t.userId === userId);

    // If Supabase is connected, query live
    if (isSupabaseConnected()) {
      try {
        const client = getSupabase();
        const [cRes, tRes] = await Promise.all([
          client.from('udhar_customers').select('*').eq('user_id', userId),
          client.from('udhar_transactions').select('*').eq('user_id', userId),
        ]);
        if (!cRes.error && cRes.data) {
          customers = cRes.data.map((c) => ({
            id: c.id,
            userId: c.user_id,
            name: c.name,
            phone: c.phone,
            notes: c.notes,
            createdAt: c.created_at,
            updatedAt: c.updated_at,
          }));
        }
        if (!tRes.error && tRes.data) {
          transactions = tRes.data.map((t) => ({
            id: t.id,
            userId: t.user_id,
            customerId: t.customer_id,
            type: t.type,
            amount: parseFloat(t.amount || '0'),
            description: t.description,
            paymentMode: t.payment_mode || 'Cash',
            dueDate: t.due_date,
            status: t.status,
            createdAt: t.created_at,
          }));
        }
      } catch (err) {
        console.warn('Supabase summary read fallback to memory:', err);
      }
    }

    let totalGave = 0; // You'll receive / Aapko Lena Hai
    let totalGot = 0;  // You received / Aapko Dena Hai
    let pendingCount = 0;

    transactions.forEach((tx) => {
      const amt = Number(tx.amount) || 0;
      if (tx.type === 'gave') {
        totalGave += amt;
      } else {
        totalGot += amt;
      }
      if (tx.status === 'pending') {
        pendingCount += 1;
      }
    });

    const netBalance = totalGave - totalGot;

    return res.json({
      totalGave,      // Total amount given (You will get)
      totalGot,       // Total amount received
      netBalance,     // Net balance (+ve means you will get, -ve means you owe)
      customerCount: customers.length,
      transactionCount: transactions.length,
      pendingCount,
    });
  } catch (err: any) {
    console.error('Error fetching udhar summary:', err);
    return res.status(500).json({ error: 'Failed to fetch udhar summary' });
  }
});

// 2. List Customers with Calculated Balances
udharRouter.get('/customers', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { search, filter } = req.query;

    let customers = db.udharCustomers.filter((c) => c.userId === userId);
    let transactions = db.udharTransactions.filter((t) => t.userId === userId);

    if (isSupabaseConnected()) {
      try {
        const client = getSupabase();
        const [cRes, tRes] = await Promise.all([
          client.from('udhar_customers').select('*').eq('user_id', userId).order('updated_at', { ascending: false }),
          client.from('udhar_transactions').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
        ]);

        if (!cRes.error && cRes.data) {
          customers = cRes.data.map((c) => ({
            id: c.id,
            userId: c.user_id,
            name: c.name,
            phone: c.phone,
            notes: c.notes,
            createdAt: c.created_at,
            updatedAt: c.updated_at,
          }));
        }
        if (!tRes.error && tRes.data) {
          transactions = tRes.data.map((t) => ({
            id: t.id,
            userId: t.user_id,
            customerId: t.customer_id,
            type: t.type,
            amount: parseFloat(t.amount || '0'),
            description: t.description,
            paymentMode: t.payment_mode || 'Cash',
            dueDate: t.due_date,
            status: t.status,
            createdAt: t.created_at,
          }));
        }
      } catch (err) {
        console.warn('Supabase customer list fallback:', err);
      }
    }

    // Build map of transactions per customer
    const customerTxMap = new Map<string, UdharTransaction[]>();
    transactions.forEach((tx) => {
      const list = customerTxMap.get(tx.customerId) || [];
      list.push(tx);
      customerTxMap.set(tx.customerId, list);
    });

    let customerRecords = customers.map((c) => {
      const txs = customerTxMap.get(c.id) || [];
      let totalGave = 0;
      let totalGot = 0;
      let lastTxAt = c.updatedAt || c.createdAt;

      txs.forEach((tx) => {
        const amt = Number(tx.amount) || 0;
        if (tx.type === 'gave') totalGave += amt;
        else totalGot += amt;
      });

      if (txs.length > 0) {
        lastTxAt = txs[0].createdAt;
      }

      const balance = totalGave - totalGot;

      return {
        ...c,
        totalGave,
        totalGot,
        balance, // positive: You'll get, negative: You owe, 0: Settled
        transactionCount: txs.length,
        lastTransactionAt: lastTxAt,
      };
    });

    // Apply search
    if (search && typeof search === 'string') {
      const q = search.toLowerCase();
      customerRecords = customerRecords.filter(
        (c) => c.name.toLowerCase().includes(q) || (c.phone && c.phone.includes(q))
      );
    }

    // Apply filter: 'all', 'receivable' (> 0), 'payable' (< 0), 'settled' (== 0)
    if (filter === 'receivable') {
      customerRecords = customerRecords.filter((c) => c.balance > 0);
    } else if (filter === 'payable') {
      customerRecords = customerRecords.filter((c) => c.balance < 0);
    } else if (filter === 'settled') {
      customerRecords = customerRecords.filter((c) => c.balance === 0);
    }

    return res.json({ customers: customerRecords });
  } catch (err: any) {
    console.error('Error fetching customers:', err);
    return res.status(500).json({ error: 'Failed to fetch customer ledgers' });
  }
});

// 3. Create New Customer / Contact
udharRouter.post('/customers', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { name, phone, notes } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Customer name is required.' });
    }

    const customer: UdharCustomer = {
      id: uuidv4(),
      userId,
      name: name.trim(),
      phone: phone?.trim() || '',
      notes: notes?.trim() || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.udharCustomers.unshift(customer);
    db.schedulePersist();

    if (isSupabaseConnected()) {
      try {
        await supabaseService.upsertUdharCustomer({
          id: customer.id,
          user_id: customer.userId,
          name: customer.name,
          phone: customer.phone,
          notes: customer.notes,
          created_at: customer.createdAt,
          updated_at: customer.updatedAt,
        });
      } catch (err) {
        console.warn('Supabase customer insert warning:', err);
      }
    }

    ActivityService.log(
      userId,
      'udhar:customer_created',
      `Added customer ${customer.name} to Udhar Khata`,
      { customerId: customer.id, name: customer.name },
      req.ip
    );

    return res.status(201).json({
      message: 'Customer added to Khata successfully.',
      customer: {
        ...customer,
        totalGave: 0,
        totalGot: 0,
        balance: 0,
        transactionCount: 0,
        lastTransactionAt: customer.createdAt,
      },
    });
  } catch (err: any) {
    console.error('Error creating customer:', err);
    return res.status(500).json({ error: 'Failed to create customer' });
  }
});

// 4. Get Customer Details and Ledger History
udharRouter.get('/customers/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    let customer = db.udharCustomers.find((c) => c.id === id && c.userId === userId);
    let transactions = db.udharTransactions.filter((t) => t.customerId === id && t.userId === userId);

    if (isSupabaseConnected()) {
      try {
        const client = getSupabase();
        const [cRes, tRes] = await Promise.all([
          client.from('udhar_customers').select('*').eq('id', id).eq('user_id', userId).maybeSingle(),
          client.from('udhar_transactions').select('*').eq('customer_id', id).eq('user_id', userId).order('created_at', { ascending: false }),
        ]);

        if (cRes.data) {
          customer = {
            id: cRes.data.id,
            userId: cRes.data.user_id,
            name: cRes.data.name,
            phone: cRes.data.phone,
            notes: cRes.data.notes,
            createdAt: cRes.data.created_at,
            updatedAt: cRes.data.updated_at,
          };
        }
        if (tRes.data) {
          transactions = tRes.data.map((t) => ({
            id: t.id,
            userId: t.user_id,
            customerId: t.customer_id,
            type: t.type,
            amount: parseFloat(t.amount || '0'),
            description: t.description,
            paymentMode: t.payment_mode || 'Cash',
            dueDate: t.due_date,
            status: t.status,
            createdAt: t.created_at,
          }));
        }
      } catch (err) {
        console.warn('Supabase customer get fallback:', err);
      }
    }

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found.' });
    }

    let totalGave = 0;
    let totalGot = 0;
    transactions.forEach((tx) => {
      const amt = Number(tx.amount) || 0;
      if (tx.type === 'gave') totalGave += amt;
      else totalGot += amt;
    });

    return res.json({
      customer: {
        ...customer,
        totalGave,
        totalGot,
        balance: totalGave - totalGot,
        transactionCount: transactions.length,
      },
      transactions,
    });
  } catch (err: any) {
    console.error('Error fetching customer details:', err);
    return res.status(500).json({ error: 'Failed to fetch customer details' });
  }
});

// 5. Add Transaction (+ You Gave / - You Received)
udharRouter.post('/transactions', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { customerId, customerName, customerPhone, type, amount, description, paymentMode, dueDate } = req.body;

    let targetCustomerId = customerId;

    if (!targetCustomerId) {
      if (customerName && typeof customerName === 'string' && customerName.trim()) {
        const cleanName = customerName.trim();
        // Check if customer with this name already exists for user
        let existingCust = db.udharCustomers.find(
          (c) => c.userId === userId && c.name.toLowerCase() === cleanName.toLowerCase()
        );

        if (existingCust) {
          targetCustomerId = existingCust.id;
        } else {
          const newCust: UdharCustomer = {
            id: uuidv4(),
            userId,
            name: cleanName,
            phone: customerPhone?.trim() || '',
            notes: '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          db.udharCustomers.unshift(newCust);
          targetCustomerId = newCust.id;

          if (isSupabaseConnected()) {
            try {
              await supabaseService.upsertUdharCustomer({
                id: newCust.id,
                user_id: newCust.userId,
                name: newCust.name,
                phone: newCust.phone,
                notes: newCust.notes,
                created_at: newCust.createdAt,
                updated_at: newCust.updatedAt,
              });
            } catch (err) {
              console.warn('Supabase auto-create customer error:', err);
            }
          }
        }
      } else {
        return res.status(400).json({ error: 'Please select an existing customer or provide a customer name.' });
      }
    }

    if (type !== 'gave' && type !== 'got') {
      return res.status(400).json({ error: "Type must be 'gave' or 'got'." });
    }
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ error: 'Valid amount greater than 0 is required.' });
    }

    const tx: UdharTransaction = {
      id: uuidv4(),
      userId,
      customerId: targetCustomerId,
      type,
      amount: numAmount,
      description: description?.trim() || '',
      paymentMode: paymentMode || 'Cash',
      dueDate: dueDate || undefined,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    db.udharTransactions.unshift(tx);

    // Update customer updatedAt timestamp
    const cust = db.udharCustomers.find((c) => c.id === targetCustomerId);
    if (cust) {
      cust.updatedAt = tx.createdAt;
    }
    db.schedulePersist();

    if (isSupabaseConnected()) {
      try {
        await supabaseService.upsertUdharTransaction({
          id: tx.id,
          user_id: tx.userId,
          customer_id: tx.customerId,
          type: tx.type,
          amount: tx.amount,
          description: tx.description,
          payment_mode: tx.paymentMode,
          due_date: tx.dueDate,
          status: tx.status,
          created_at: tx.createdAt,
        });
      } catch (err) {
        console.warn('Supabase transaction insert warning:', err);
      }
    }

    ActivityService.log(
      userId,
      'udhar:transaction_added',
      `${type === 'gave' ? 'Gave ₹' : 'Received ₹'}${numAmount} with ${cust?.name || 'Customer'}`,
      { customerId, type, amount: numAmount },
      req.ip
    );

    return res.status(201).json({
      message: 'Transaction saved to Khata.',
      transaction: tx,
    });
  } catch (err: any) {
    console.error('Error adding transaction:', err);
    return res.status(500).json({ error: 'Failed to record transaction' });
  }
});

// 6. Settle or Update Transaction Status
udharRouter.patch('/transactions/:id/settle', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const tx = db.udharTransactions.find((t) => t.id === id && t.userId === userId);
    if (!tx) {
      return res.status(404).json({ error: 'Transaction not found.' });
    }

    tx.status = 'settled';
    db.schedulePersist();

    if (isSupabaseConnected()) {
      try {
        await supabaseService.upsertUdharTransaction({
          id: tx.id,
          user_id: tx.userId,
          customer_id: tx.customerId,
          type: tx.type,
          amount: tx.amount,
          description: tx.description,
          payment_mode: tx.paymentMode,
          due_date: tx.dueDate,
          status: 'settled',
          created_at: tx.createdAt,
        });
      } catch (err) {
        console.warn('Supabase settle warning:', err);
      }
    }

    return res.json({ message: 'Transaction marked as settled.', transaction: tx });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to settle transaction' });
  }
});

// 7. Delete Transaction
udharRouter.delete('/transactions/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const idx = db.udharTransactions.findIndex((t) => t.id === id && t.userId === userId);
    if (idx !== -1) {
      db.udharTransactions.splice(idx, 1);
      db.schedulePersist();
    }

    if (isSupabaseConnected()) {
      try {
        await supabaseService.deleteUdharTransaction(id);
      } catch (err) {
        console.warn('Supabase tx delete warning:', err);
      }
    }

    return res.json({ message: 'Transaction deleted successfully.' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to delete transaction' });
  }
});

// 8. Delete Customer & All Transactions
udharRouter.delete('/customers/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const cIdx = db.udharCustomers.findIndex((c) => c.id === id && c.userId === userId);
    if (cIdx !== -1) {
      db.udharCustomers.splice(cIdx, 1);
    }

    // Remove all transactions
    let tIdx = db.udharTransactions.findIndex((t) => t.customerId === id && t.userId === userId);
    while (tIdx !== -1) {
      db.udharTransactions.splice(tIdx, 1);
      tIdx = db.udharTransactions.findIndex((t) => t.customerId === id && t.userId === userId);
    }

    db.schedulePersist();

    if (isSupabaseConnected()) {
      try {
        await supabaseService.deleteUdharCustomer(id);
      } catch (err) {
        console.warn('Supabase customer delete warning:', err);
      }
    }

    return res.json({ message: 'Customer and all transactions removed.' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to delete customer' });
  }
});
