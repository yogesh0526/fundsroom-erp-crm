# Fundsroom Mini ERP + CRM Operations Portal

> A modern, full-stack wholesale and distribution operations portal engineered for managing multi-role enterprise workflows: Customer CRM, Inventory & Stock Movement, Atomic Sales Challans with strict stock invariance, and Commercial GST Invoicing with PDF export.

---

## 🔗 Quick Links & Evaluation Summary

| Environment | Service | Access URL |
|---|---|---|
| **Live Production** | 🌐 **Live Frontend Application (Vercel)** | [https://fundsroom-erp-crm-five.vercel.app](https://fundsroom-erp-crm-five.vercel.app) |
| **Local Development** | 💻 **Frontend Web App** | [`http://localhost:5173`](http://localhost:5173) |
| **Local Development** | ⚙️ **Backend REST API** | [`http://localhost:5000`](http://localhost:5000) |
| **Local Development** | 📚 **Interactive Swagger / OpenAPI Docs** | [`http://localhost:5000/api/docs`](http://localhost:5000/api/docs) |
| **API Testing** | 📬 **Postman Collection v2.1** | [`postman_collection.json`](./postman_collection.json) |

---

## ⚡ Instant 2-Minute Local Run Guide

To run the full stack locally on your computer:

```powershell
# Terminal 1: Start Backend API (Port 5000)
cd C:\Fundsroom\backend
npm install
npm run prisma:seed   # Seeds users, products, customers, and challans
npm run dev

# Terminal 2: Start Frontend UI (Port 5173)
cd C:\Fundsroom\frontend
npm install
npm run dev
```

- Open **`http://localhost:5173`** in your browser.
- Interactive API Docs are live at **`http://localhost:5000/api/docs`**.

---

## 🔑 Test Login Credentials (All 4 Roles Pre-Seeded)

All 4 required roles are pre-seeded into the database and available for instant testing:

| Role | Email Address | Password | Primary Permissions |
|---|---|---|---|
| **Admin** | `admin@erp.com` | `Admin@123` | Full system access across all modules |
| **Sales** | `sales@erp.com` | `Sales@123` | Customer CRM, Follow-up Notes, Create & Confirm Challans |
| **Warehouse** | `warehouse@erp.com` | `Warehouse@123` | Product Catalog, Stock Adjustments, Movement Ledger |
| **Accounts** | `accounts@erp.com` | `Accounts@123` | Customer Directory, Challans Audit, Invoices & PDF Export |

> **Evaluator Tip:** The web application features quick 1-click test buttons on the Login screen and a **"Switch Test Persona"** dropdown in the top navbar to seamlessly test all roles without re-typing passwords.

---

## 📋 Table of Contents
1. [Business Context & Core Features](#business-context--core-features)
2. [Tech Stack](#tech-stack)
3. [Role-Based Access Control (RBAC) Matrix](#role-based-access-control-rbac-matrix)
4. [Critical Business Logic & Invariants](#critical-business-logic--invariants)
5. [System Architecture](#system-architecture)
6. [Local Setup Guide (Detailed)](#local-setup-guide-detailed)
7. [Docker Compose Deployment](#docker-compose-deployment)
8. [Free Cloud & AWS Deployment Guide](#free-cloud--aws-deployment-guide)
9. [Environment Variables Reference](#environment-variables-reference)
10. [API Documentation & Postman Collection](#api-documentation--postman-collection)
11. [Assumptions Made & Known Limitations](#assumptions-made--known-limitations)

---

## 🏢 Business Context & Core Features

This platform simulates the daily operations of a wholesale/distribution company dealing with commercial clients, inventory stocking, sales orders, dispatches, and billing:

### 1. Multi-Role Authentication
- Secure JWT-based authentication with bcrypt password hashing.
- Role-based route guards and API middleware for **Admin**, **Sales**, **Warehouse**, and **Accounts**.
- **1-Click Test Persona Switcher**: In addition to standard email/password login, the portal includes an interactive demo bar to switch between all 4 personas with a single click.

### 2. Customer CRM Module
- Complete client lifecycle tracking: **Lead**, **Active**, and **Inactive**.
- Segmentation by **Retail**, **Wholesale**, and **Distributor**.
- Business GSTIN tracking, contact details, and multiple addresses.
- **Follow-up Interaction Timeline**: Sales representatives can post notes, set next action dates, and view historical communications and past sales orders.

### 3. Product & Inventory Module
- Real-time stock counts, wholesale pricing, SKU codes, and warehouse bin/bay locations.
- **Low Stock Threshold Alerts**: Visual indicators and dedicated alert filters whenever `currentStock <= minStockAlert`.
- **Stock Movement Ledger**: Complete audit trail tracking movement type (`IN` or `OUT`), quantity, reason (e.g. PO inward, challan dispatch, return, damage scrap), author, and timestamp.
- **Manual Stock Adjustments**: Warehouse team can execute stock receipts or write-offs with ACID transaction guarantees.
- **Product Image Upload**: Built-in image upload supporting **AWS S3** with automatic local fallback storage.

### 4. Sales Challan Module
- Sales users select a customer and construct dynamic multi-item orders.
- Auto-generated sequential challan numbers (`SCH-YYYYMM-XXXX`).
- Save as **Draft** (no stock impact) or **Confirmed** (immediate dispatch).
- **Product Snapshot Data**: Product name, SKU, and unit price are permanently snapshotted into the challan items at the moment of order, preventing future price edits from corrupting historical financial records.
- **ACID Transaction Guarantee**: When confirming a challan, the database verifies stock on hand; if insufficient, the transaction rolls back cleanly with HTTP 400.
- **Restocking on Cancellation**: Cancelling a confirmed challan restores inventory and logs an `IN` movement automatically.

### 5. Invoices & Billing (Bonus)
- Generate official Commercial GST Invoices directly from confirmed challans.
- Computes Subtotal, 18% standard GST (9% CGST + 9% SGST), and Grand Total.
- **Export PDF Invoices**: Generates formatted, commercial Tax Invoice PDFs and Delivery Challan PDFs on the fly using PDFKit.

---

## 🛠️ Tech Stack

| Layer | Technologies |
|---|---|
| **Backend** | Node.js (v22+), TypeScript, Express.js, Prisma ORM, PostgreSQL |
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons, Axios, React Router 6 |
| **Validation & Security** | Zod schema validation, JWT, BcryptJS, CORS, Role-based Middleware |
| **Document Generation** | PDFKit (Tax Invoices and Sales Challans) |
| **Storage** | AWS S3 SDK (`@aws-sdk/client-s3`) + Multer disk storage fallback |
| **DevOps & Containers** | Docker, Docker Compose, Nginx, GitHub Actions CI/CD |

---

## 🛡️ Role-Based Access Control (RBAC) Matrix

| Module / Action | Admin | Sales | Warehouse | Accounts |
|---|:---:|:---:|:---:|:---:|
| **Dashboard KPIs** | ✅ | ✅ | ✅ | ✅ |
| **View Customers** | ✅ | ✅ | ❌ | ✅ |
| **Create / Edit Customer** | ✅ | ✅ | ❌ | ❌ |
| **Post CRM Follow-up Note** | ✅ | ✅ | ❌ | ❌ |
| **View Products Catalog** | ✅ | ✅ | ✅ | ✅ |
| **Create / Edit Product SKU** | ✅ | ❌ | ✅ | ❌ |
| **Upload Product Image** | ✅ | ❌ | ✅ | ❌ |
| **Manual Stock In / Out (Adjust)** | ✅ | ❌ | ✅ | ❌ |
| **View Stock Movement Ledger** | ✅ | ❌ | ✅ | ❌ |
| **View Sales Challans** | ✅ | ✅ | ✅ | ✅ |
| **Create Sales Challan (Draft/Confirm)** | ✅ | ✅ | ❌ | ❌ |
| **Confirm Draft Challan** | ✅ | ✅ | ✅ | ❌ |
| **Cancel Challan & Restock** | ✅ | ✅ | ❌ | ❌ |
| **Generate Invoice** | ✅ | ❌ | ❌ | ✅ |
| **Download Challan & Invoice PDF** | ✅ | ✅ | ✅ | ✅ |

---

## ⚙️ Critical Business Logic & Invariants

1. **Strict Stock Non-Negativity Invariant**:
   - Stock counts in warehouse can **never** become negative.
   - When a challan is confirmed or a warehouse stock deduction is submitted, the API runs inside an atomic `prisma.$transaction`.
   - If `currentStock < requestedQuantity`, the transaction immediately aborts and returns HTTP 400.
2. **Snapshot Immutability**:
   - When saving or confirming a Challan, the product name, SKU, and unit price are saved as line item snapshots.
   - If a product price or name changes in the catalog later, historical sales challans and invoices remain unchanged.
3. **Double Invoicing Prevention**:
   - An invoice can only be generated for a `CONFIRMED` sales challan.
   - Each challan has a 1-to-1 unique relationship with an invoice; generating a second invoice for the same challan is rejected.
4. **Restocking on Cancellation**:
   - When a `CONFIRMED` challan is cancelled, the items are automatically credited back to the warehouse product stock and logged in `StockMovement` as `IN` with reason `CHALLAN_CANCELLED_RESTOCK`.

---

## 🏗️ System Architecture

```
┌────────────────────────────────────────────────────────────┐
│                    React + Vite Frontend                   │
│  (Tailwind CSS, Lucide Icons, Role Persona Switcher)       │
└────────────────────────────┬───────────────────────────────┘
                             │ REST + Bearer JWT
┌────────────────────────────▼───────────────────────────────┐
│                 Express.js + TypeScript API                │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ Middlewares: Auth Guard, RBAC Role Guard, Zod Validate│ │
│  └───────────────────────────────────────────────────────┘ │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ Services: ACID Transactions, PDFKit Invoice Engine    │ │
│  └───────────────────────────────────────────────────────┘ │
└──────────────┬─────────────────────────────┬───────────────┘
               │                             │
┌──────────────▼──────────────┐ ┌────────────▼───────────────┐
│     PostgreSQL Database     │ │   AWS S3 / Local Storage   │
│         (Prisma ORM)        │ │      (Product Photos)      │
└─────────────────────────────┘ └────────────────────────────┘
```

---

## 🚀 Local Setup Guide (Detailed)

### Prerequisites
- **Node.js**: v20 or v22 installed
- **PostgreSQL**: PostgreSQL 15, 16, 17, or 18 running locally or on a cloud provider (e.g. Neon/Supabase)

### 1. Database Setup
```sql
CREATE DATABASE erp_crm_db;
```

### 2. Backend Setup
```bash
cd backend
npm install
cp .env.example .env
npx prisma db push
npm run prisma:seed
npm run dev
```
Backend will start on: **`http://localhost:5000`**  
Swagger API documentation: **`http://localhost:5000/api/docs`**

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Frontend will start on: **`http://localhost:5173`**

### 4. Run Automated Test Suite
```bash
cd backend
npx ts-node-dev src/tests/business-logic.test.ts
```
Expected output:
```
🎯 Test Summary: 15 Passed, 0 Failed
```

---

## 🐳 Docker Compose Deployment

```bash
docker-compose up --build
```
This provisions:
- `erp_postgres`: PostgreSQL 16 database
- `erp_backend`: Express + TypeScript API on port `5000`
- `erp_frontend`: React application served by Nginx on port `80`

Open your browser at **`http://localhost`**.

---

## 💡 Assumptions Made & Known Limitations

### Assumptions Made
1. **Tax Model**: Standard Indian Wholesale GST calculation is applied (18% total = 9% CGST + 9% SGST).
2. **Product Snapshots**: To prevent historical invoice/challan disputes, changes to product catalogs do not mutate existing past orders.
3. **Storage Fallback**: AWS S3 integration is implemented with automatic local disk storage fallback (`backend/uploads/`).

### Known Limitations & Roadmap
1. **Multi-Warehouse Transfers**: Currently supports warehouse bin locations per SKU; inter-depot stock transfers can be added.
2. **Automated Email Dispatch**: PDFs are downloaded directly in the browser; automated dispatch via SendGrid/SES email can be hooked in.
3. **Partial Challan Fulfillment**: Backorder splitting for partial shipments.

---

**Developed for the Fundsroom Full Stack Developer Case Study.**
