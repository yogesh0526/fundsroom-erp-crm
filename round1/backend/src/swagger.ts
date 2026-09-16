import { Express, Request, Response } from 'express';

export const openApiSpec = {
  openapi: '3.0.0',
  info: {
    title: 'Mini ERP + CRM Operations Portal API',
    version: '1.0.0',
    description:
      'Production-ready REST API for Wholesale & Distribution Operations with Role-Based Access Control, CRM Follow-ups, Inventory Tracking, Atomic Sales Challans, and PDF Invoicing.',
    contact: {
      name: 'Fundsroom Engineering',
      email: 'dev@fundsroom-erp.internal',
    },
  },
  servers: [
    {
      url: 'http://localhost:5000/api',
      description: 'Local Development Server',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
  },
  security: [{ bearerAuth: [] }],
  paths: {
    '/auth/login': {
      post: {
        summary: 'User login for Admin, Sales, Warehouse, Accounts',
        tags: ['Authentication'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  email: { type: 'string', example: 'admin@erp.com' },
                  password: { type: 'string', example: 'Admin@123' },
                },
                required: ['email', 'password'],
              },
            },
          },
        },
        responses: {
          200: { description: 'Authenticated successfully with JWT token' },
          401: { description: 'Invalid credentials' },
        },
      },
    },
    '/auth/me': {
      get: {
        summary: 'Retrieve currently authenticated user profile and role',
        tags: ['Authentication'],
        responses: { 200: { description: 'Current user profile' } },
      },
    },
    '/customers': {
      get: {
        summary: 'List customers with search, status & type filter, pagination',
        tags: ['Customers CRM'],
        parameters: [
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'type', in: 'query', schema: { type: 'string', enum: ['RETAIL', 'WHOLESALE', 'DISTRIBUTOR'] } },
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['LEAD', 'ACTIVE', 'INACTIVE'] } },
          { name: 'page', in: 'query', schema: { type: 'integer' } },
          { name: 'limit', in: 'query', schema: { type: 'integer' } },
        ],
        responses: { 200: { description: 'Paginated customer list' } },
      },
      post: {
        summary: 'Create a new customer (Sales & Admin)',
        tags: ['Customers CRM'],
        responses: { 201: { description: 'Customer created' } },
      },
    },
    '/products': {
      get: {
        summary: 'List catalog products with low-stock alerts and category filters',
        tags: ['Products & Inventory'],
        responses: { 200: { description: 'Products list' } },
      },
      post: {
        summary: 'Create a new product (Warehouse & Admin)',
        tags: ['Products & Inventory'],
        responses: { 201: { description: 'Product created' } },
      },
    },
    '/inventory/adjust': {
      post: {
        summary: 'Manual stock adjustment IN or OUT with atomic transaction and movement reason',
        tags: ['Products & Inventory'],
        responses: { 200: { description: 'Stock adjusted' }, 400: { description: 'Insufficient stock or invalid input' } },
      },
    },
    '/inventory/movements': {
      get: {
        summary: 'Audit log of stock movements (IN/OUT)',
        tags: ['Products & Inventory'],
        responses: { 200: { description: 'Movement logs' } },
      },
    },
    '/challans': {
      get: {
        summary: 'List sales challans (Draft, Confirmed, Cancelled)',
        tags: ['Sales Challans'],
        responses: { 200: { description: 'Challan list' } },
      },
      post: {
        summary: 'Create a sales challan (Draft or Confirmed with atomic stock reduction)',
        tags: ['Sales Challans'],
        responses: { 201: { description: 'Challan created' } },
      },
    },
    '/challans/{id}/status': {
      patch: {
        summary: 'Update status (e.g. Confirm draft challan, reducing stock atomically)',
        tags: ['Sales Challans'],
        responses: { 200: { description: 'Status updated' }, 400: { description: 'Insufficient stock' } },
      },
    },
    '/challans/{id}/pdf': {
      get: {
        summary: 'Download Sales Delivery Challan as PDF',
        tags: ['Sales Challans'],
        responses: { 200: { description: 'PDF stream' } },
      },
    },
    '/invoices': {
      get: {
        summary: 'List all commercial invoices (Accounts & Admin)',
        tags: ['Invoices & Billing'],
        responses: { 200: { description: 'Invoices list' } },
      },
    },
    '/invoices/generate/{challanId}': {
      post: {
        summary: 'Generate invoice from a confirmed sales challan',
        tags: ['Invoices & Billing'],
        responses: { 201: { description: 'Invoice generated' } },
      },
    },
    '/invoices/{id}/pdf': {
      get: {
        summary: 'Download Tax Invoice as professional PDF (Bonus Point Feature)',
        tags: ['Invoices & Billing'],
        responses: { 200: { description: 'PDF stream' } },
      },
    },
  },
};

export const setupDocs = (app: Express) => {
  app.get('/api/docs/spec.json', (_req: Request, res: Response) => {
    res.json(openApiSpec);
  });

  app.get('/api/docs', (_req: Request, res: Response) => {
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>ERP + CRM API Documentation</title>
          <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
          <style>
            body { margin: 0; padding: 0; background: #fafafa; font-family: sans-serif; }
            .topbar { display: none; }
          </style>
        </head>
        <body>
          <div id="swagger-ui"></div>
          <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
          <script>
            window.onload = () => {
              window.ui = SwaggerUIBundle({
                url: '/api/docs/spec.json',
                dom_id: '#swagger-ui',
                presets: [
                  SwaggerUIBundle.presets.apis,
                  SwaggerUIBundle.SwaggerUIStandalonePreset
                ],
                layout: "BaseLayout"
              });
            };
          </script>
        </body>
      </html>
    `);
  });
};
