# Fundsroom Mini ERP + CRM Operations Portal

> A modern, full-stack wholesale and distribution operations portal engineered for managing multi-role enterprise workflows: Customer CRM, Inventory & Stock Movement, Atomic Sales Challans with strict stock invariance, and Commercial GST Invoicing with PDF export.

---

## 📋 Table of Contents
1. [Business Context & Core Features](#business-context--core-features)
2. [Tech Stack](#tech-stack)
3. [Test Login Credentials for All Roles](#test-login-credentials-for-all-roles)
4. [Role-Based Access Control (RBAC) Matrix](#role-based-access-control-rbac-matrix)
5. [Critical Business Logic & Invariants](#critical-business-logic--invariants)
6. [System Architecture](#system-architecture)
7. [Local Setup Guide (Step-by-Step)](#local-setup-guide-step-by-step)
8. [Docker Compose Deployment](#docker-compose-deployment)
9. [Free Cloud & AWS Deployment Guide](#free-cloud--aws-deployment-guide)
10. [Environment Variables Reference](#environment-variables-reference)
11. [API Documentation & Postman Collection](#api-documentation--postman-collection)
12. [Assumptions Made & Known Limitations](#assumptions-made--known-limitations)

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

## 🔑 Test Login Credentials for All Roles

All 4 required roles are pre-seeded into the PostgreSQL database:

| Role | Email Address | Password | Primary Permissions |
|---|---|---|---|
| **Admin** | `admin@erp.com` | `Admin@123` | Full system access across all modules |
| **Sales** | `sales@erp.com` | `Sales@123` | Customer CRM, Follow-up Notes, Create & Confirm Challans |
| **Warehouse** | `warehouse@erp.com` | `Warehouse@123` | Product Catalog, Stock Adjustments, Stock Movement Ledger |
| **Accounts** | `accounts@erp.com` | `Accounts@123` | Customer Directory, Challans Audit, Generate Invoices & PDF Export |

> **Evaluator Tip:** The web application features quick 1-click buttons on the Login page and a **"Switch Test Persona"** dropdown in the top navbar to seamlessly test all roles without re-typing passwords.

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
   - If `currentStock < requestedQuantity`, the transaction immediately aborts and returns HTTP 400:
     ```json
     {
       "success": false,
       "message": "Insufficient stock for 'Heavy Duty Angle Grinder 850W' (SKU: TL-AG-850). Available: 8, Requested: 15. Stock cannot go negative."
     }
     ```
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

## 🚀 Local Setup Guide (Step-by-Step)

### Prerequisites
- **Node.js**: v20 or v22 installed
- **PostgreSQL**: PostgreSQL 15, 16, 17, or 18 running locally or on a cloud provider (e.g. Neon/Supabase)

### 1. Database Setup
Ensure PostgreSQL is running and create the database:
```sql
CREATE DATABASE erp_crm_db;
```

### 2. Backend Setup
```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Configure environment variables (Default configured for local PostgreSQL)
cp .env.example .env

# Sync database schema with PostgreSQL
npx prisma db push

# Seed initial roles, products, customers, movements & orders
npm run prisma:seed

# Start backend development server
npm run dev
```
Backend will start on: **`http://localhost:5000`**
Swagger API documentation: **`http://localhost:5000/api/docs`**

### 3. Frontend Setup
```bash
# In a new terminal, navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start Vite development server
npm run dev
```
Frontend will start on: **`http://localhost:5173`**

### 4. Run Automated Test Suite
To verify the business logic, stock deduction invariants, and invoice calculations:
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

A complete multi-container Docker setup is included:
```bash
# From project root
docker-compose up --build
```
This provisions:
- `erp_postgres`: PostgreSQL 16 database
- `erp_backend`: Express + TypeScript API on port `5000`
- `erp_frontend`: React application served by Nginx on port `80`

Open your browser at **`http://localhost`**.

---

## ☁️ Free Cloud & AWS Deployment Guide

### Option 1: Free Cloud Hosting (Recommended for Submissions)
- **Database**: Create a free PostgreSQL instance on **[Neon.tech](https://neon.tech)** or **[Supabase](https://supabase.com)**. Copy the pooled connection string into `DATABASE_URL`.
- **Backend**:
  1. Push repository to GitHub.
  2. Create a new Web Service on **[Render.com](https://render.com)** or **[Railway.app](https://railway.app)**.
  3. Root directory: `backend`.
  4. Build command: `npm install && npx prisma generate && npm run build`.
  5. Start command: `npx prisma db push && node dist/server.js`.
  6. Add environment variables: `DATABASE_URL`, `JWT_SECRET`, `NODE_ENV=production`.
- **Frontend**:
  1. Create a new Static Site on **[Vercel](https://vercel.com)** or **[Netlify](https://netlify.com)**.
  2. Root directory: `frontend`.
  3. Build command: `npm run build`.
  4. Output directory: `dist`.
  5. Set `VITE_API_URL` to your Render/Railway backend URL.

### Option 2: AWS Deployment (Bonus Guide)
1. **Database**: Provision an **AWS RDS PostgreSQL** (Free Tier `db.t4g.micro` or `db.t3.micro`).
2. **Compute**: Launch an **AWS EC2** instance (Ubuntu 24.04 LTS `t3.small` or `t2.micro`).
   - Install Docker & Docker Compose:
     ```bash
     sudo apt update && sudo apt install -y docker.io docker-compose
     ```
   - Clone repository and update `.env` with RDS `DATABASE_URL`.
   - Run `docker-compose up -d --build`.
3. **AWS S3 Bucket**:
   - Create S3 bucket `fundsroom-product-assets`.
   - Create IAM user with `AmazonS3FullAccess` and populate `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, and `AWS_S3_BUCKET_NAME`.
4. **Domain & SSL**: Setup AWS Route 53 with an Elastic IP and obtain a free SSL certificate via Let's Encrypt / Certbot.

---

## ⚙️ Environment Variables Reference

### Backend (`backend/.env`)
| Variable | Description | Example / Default |
|---|---|---|
| `PORT` | HTTP port the server listens on | `5000` |
| `NODE_ENV` | Application environment | `development` or `production` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:root@localhost:5432/erp_crm_db?schema=public` |
| `JWT_SECRET` | Secret key for signing auth tokens | `super-secret-jwt-key-wholesale-erp-crm-2026` |
| `JWT_EXPIRES_IN` | Token expiration duration | `7d` |
| `CLIENT_URL` | Allowed frontend origin for CORS | `http://localhost:5173` |
| `AWS_REGION` | AWS region for S3 uploads | `us-east-1` |
| `AWS_ACCESS_KEY_ID` | AWS IAM Access Key | *(Optional)* |
| `AWS_SECRET_ACCESS_KEY` | AWS IAM Secret Key | *(Optional)* |
| `AWS_S3_BUCKET_NAME` | AWS S3 Bucket Name | *(Optional)* |

---

## 📑 API Documentation & Postman Collection

### Interactive Swagger / OpenAPI Docs
Visit **`http://localhost:5000/api/docs`** in your browser when the server is running to view and test all endpoints interactively.

### Postman Collection
The root directory includes a pre-configured, complete collection:
`postman_collection.json`
- Includes pre-request scripts that automatically extract and inject the JWT Bearer token upon logging in.
- Organized into modules: Auth, Customers, Products, Inventory, Challans, and Invoices.

---

## 💡 Assumptions Made & Known Limitations

### Assumptions Made
1. **Tax Model**: Standard Indian Wholesale GST calculation is applied (18% total = 9% CGST + 9% SGST).
2. **Product Snapshots**: To prevent historical invoice/challan disputes, changes to product catalogs do not mutate existing past orders.
3. **Storage Fallback**: AWS S3 integration is implemented; however, if AWS credentials are not specified in `.env`, the system automatically falls back to local disk storage (`backend/uploads/`) so evaluators can run the project locally without needing a paid AWS account.

### Known Limitations & Roadmap
1. **Multi-Warehouse Transfers**: Currently supports multiple warehouse locations/bays recorded per product, but internal transfer orders between distinct warehouses (e.g., WH-Pune to WH-Mumbai) can be added as a next iteration.
2. **Email Dispatch**: Challan and Invoice PDFs are downloaded directly in the browser; automated dispatch via SendGrid/SES email can be hooked into the invoice generation service.
3. **Partial Challan Fulfillment**: Challans currently deduct the entire requested quantity upon confirmation; backorder splitting can be introduced for partial shipments.

---

**Developed for the Fundsroom Full Stack Developer Case Study.**
