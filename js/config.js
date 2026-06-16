/* Global namespace + constants */
window.PCT = window.PCT || {};

PCT.STORAGE = {
  USERS:       'pct_users',
  CUSTOMERS:   'pct_customers',
  REQUESTS:    'pct_requests',
  MATRIX:      'pct_matrix',
  POLICIES:    'pct_policies',
  CURRENT_USER:'pct_current_user',
  INITIALIZED: 'pct_initialized'
};

PCT.ROLES = {
  SALES:      'sales',
  APPROVER:   'approver',
  ACCOUNTING: 'accounting',
  ADMIN:      'admin'
};

PCT.ROLE_LABELS = {
  sales:      'Sales',
  approver:   'Approver',
  accounting: 'Accounting',
  admin:      'Admin'
};

PCT.STATUS = {
  DRAFT:     'draft',
  PENDING:   'pending',
  APPROVED:  'approved',
  REJECTED:  'rejected',
  PROCESSED: 'processed',
  CANCELLED: 'cancelled'
};

PCT.STATUS_LABELS = {
  draft:     'ร่าง',
  pending:   'รอพิจารณา',
  approved:  'อนุมัติแล้ว',
  rejected:  'ไม่อนุมัติ',
  processed: 'ดำเนินการแล้ว',
  cancelled: 'ยกเลิก'
};

PCT.REQUEST_TYPE_LABELS = {
  payment_term: 'เงื่อนไขการชำระเงิน',
  credit_term:  'วงเงินเครดิต',
  both:         'ทั้งสองรายการ',
  hardware:     'Hardware',
  software_installation: 'Software & Installation'
};

PCT.PAYMENT_METHOD_LABELS = {
  transfer:        'โอนเงินธนาคาร',
  cheque:          'เช็ค',
  cash:            'เงินสด',
  credit_card:     'บัตรเครดิต',
  letter_of_credit:'Letter of Credit (L/C)'
};

PCT.DEAL_CATEGORY_LABELS = {
  hardware:    'Hardware / อุปกรณ์',
  software:    'Software / ซอฟต์แวร์',
  installation:'Installation / ติดตั้ง',
  maintenance: 'Maintenance / บำรุงรักษา'
};

PCT.PAYMENT_TERM_LABELS = {
  cod:         'COD — ชำระทันที',
  net7:        'Net 7',
  net15:       'Net 15',
  net30:       'Net 30',
  net45:       'Net 45',
  net60:       'Net 60',
  net90:       'Net 90',
  installment: 'ผ่อนชำระ (Installment)',
  custom:      'กำหนดเอง (Custom)'
};

PCT.Pages = {};
PCT.Router = {};
PCT.Auth   = {};
PCT.Data   = {};
PCT.UI     = {};
PCT.Icons  = {};
