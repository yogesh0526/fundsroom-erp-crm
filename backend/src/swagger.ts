export const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'Industrial Supply ERP System API',
    version: '1.0.0',
    description:
      'Robust REST API for Industrial Supply ERP workflow: Enquiry → Quotation → Sales Order → Inventory Reservation → Dispatch',
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
        summary: 'Authenticate User & Obtain JWT',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  email: { type: 'string', example: 'admin@erp.com' },
                  password: { type: 'string', example: 'admin123' },
                },
                required: ['email', 'password'],
              },
            },
          },
        },
        responses: {
          200: { description: 'Login successful with JWT token & user info' },
          401: { description: 'Invalid credentials' },
        },
      },
    },
    '/auth/me': {
      get: {
        summary: 'Get current authenticated user profile',
        responses: {
          200: { description: 'User profile returned' },
          401: { description: 'Unauthorized' },
        },
      },
    },
    '/products': {
      get: {
        summary: 'List all products with stock availability',
        responses: {
          200: { description: 'List of products with physical, reserved, and available stock' },
        },
      },
    },
    '/inventory': {
      get: {
        summary: 'Get inventory stock balances for all products',
        responses: {
          200: { description: 'Full inventory ledger' },
        },
      },
    },
    '/inventory/{id}': {
      patch: {
        summary: 'Update inventory stock (Admin Only, e.g. add damaged stock)',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  physicalQuantity: { type: 'integer' },
                  damagedQuantity: { type: 'integer' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Inventory updated' },
          400: { description: 'Invalid quantities or limit exceeded' },
          403: { description: 'Admin role required' },
        },
      },
    },
    '/customers': {
      get: {
        summary: 'List all customers',
        responses: { 200: { description: 'List of customers' } },
      },
      post: {
        summary: 'Create a new customer',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  companyName: { type: 'string', example: 'Omega Dynamics Ltd.' },
                  contactPerson: { type: 'string', example: 'Anil Kapoor' },
                  mobile: { type: 'string', example: '9823412345' },
                  email: { type: 'string', example: 'anil@omegadynamics.com' },
                  city: { type: 'string', example: 'Mumbai' },
                },
                required: ['companyName', 'contactPerson', 'mobile', 'email', 'city'],
              },
            },
          },
        },
        responses: { 201: { description: 'Customer created' } },
      },
    },
    '/enquiries': {
      get: {
        summary: 'List all enquiries (supports ?status= filter)',
        responses: { 200: { description: 'List of enquiries' } },
      },
      post: {
        summary: 'Create an enquiry with multiple product items',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  customerId: { type: 'string', format: 'uuid' },
                  requiredDate: { type: 'string', format: 'date-time' },
                  notes: { type: 'string' },
                  items: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        productId: { type: 'string', format: 'uuid' },
                        quantity: { type: 'integer', example: 50 },
                        notes: { type: 'string' },
                      },
                      required: ['productId', 'quantity'],
                    },
                  },
                },
                required: ['customerId', 'requiredDate', 'items'],
              },
            },
          },
        },
        responses: { 201: { description: 'Enquiry created' } },
      },
    },
    '/enquiries/{id}/status': {
      patch: {
        summary: 'Update enquiry status (NEW, QUOTED, WON, LOST)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  status: { type: 'string', enum: ['NEW', 'QUOTED', 'WON', 'LOST'] },
                },
                required: ['status'],
              },
            },
          },
        },
        responses: { 200: { description: 'Enquiry status updated' } },
      },
    },
    '/quotations': {
      get: {
        summary: 'List all quotations',
        responses: { 200: { description: 'List of quotations' } },
      },
      post: {
        summary: 'Create a quotation against an enquiry (Backend calculates totals)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  enquiryId: { type: 'string', format: 'uuid' },
                  validUntil: { type: 'string', format: 'date-time' },
                  notes: { type: 'string' },
                  items: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        productId: { type: 'string', format: 'uuid' },
                        quantity: { type: 'integer', example: 10 },
                        unitPrice: { type: 'number', example: 18500 },
                        discountPercent: { type: 'number', example: 5 },
                        gstPercent: { type: 'number', example: 18 },
                      },
                      required: ['productId', 'quantity', 'unitPrice'],
                    },
                  },
                },
                required: ['enquiryId', 'validUntil', 'items'],
              },
            },
          },
        },
        responses: { 201: { description: 'Quotation created with calculated pricing' } },
      },
    },
    '/quotations/{id}/status': {
      patch: {
        summary: 'Update quotation status (DRAFT, SENT, ACCEPTED, REJECTED)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  status: { type: 'string', enum: ['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED'] },
                },
                required: ['status'],
              },
            },
          },
        },
        responses: { 200: { description: 'Quotation status updated' } },
      },
    },
    '/quotations/{id}/convert': {
      post: {
        summary: 'Convert ACCEPTED quotation to a Sales Order',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          201: { description: 'Sales Order created in PENDING status' },
          400: { description: 'Quotation is not ACCEPTED' },
          409: { description: 'Quotation has already been converted' },
        },
      },
    },
    '/sales-orders': {
      get: {
        summary: 'List all Sales Orders',
        responses: { 200: { description: 'List of sales orders' } },
      },
    },
    '/sales-orders/{id}/confirm': {
      post: {
        summary: 'Confirm Sales Order & Atomically Reserve Stock (Admin Only, Pessimistic Row Lock)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Order confirmed and inventory reserved' },
          400: { description: 'Insufficient stock or order not PENDING' },
          403: { description: 'Admin role required' },
        },
      },
    },
    '/sales-orders/{id}/dispatch': {
      post: {
        summary: 'Dispatch Confirmed Sales Order (Admin Only, Decrements Physical and Reserved Quantities)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  vehicleNumber: { type: 'string', example: 'MH-12-AB-9876' },
                  driverName: { type: 'string', example: 'Ramesh Kumar' },
                  notes: { type: 'string' },
                },
                required: ['vehicleNumber', 'driverName'],
              },
            },
          },
        },
        responses: {
          201: { description: 'Dispatch created and inventory balances decremented' },
          400: { description: 'Order not CONFIRMED or quantity limit exceeded' },
          403: { description: 'Admin role required' },
          409: { description: 'Order already dispatched' },
        },
      },
    },
    '/sales-orders/{id}/cancel': {
      post: {
        summary: 'Cancel Sales Order (Releases reserved stock if CONFIRMED)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Order cancelled and reserved stock released' },
          400: { description: 'Cannot cancel dispatched order' },
        },
      },
    },
    '/dispatches': {
      get: {
        summary: 'List all dispatches',
        responses: { 200: { description: 'List of dispatch records' } },
      },
    },
  },
};
