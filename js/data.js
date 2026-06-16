/* Data layer — localStorage CRUD + seed data */
PCT.Data = {

  SEED_USERS: [
    { id:'usr_001', name:'สมชาย ใจดี',      email:'sales@company.com',      password:'sales123',    role:'sales',      department:'Sales',      active:true },
    { id:'usr_002', name:'วิภา รักดี',       email:'sales2@company.com',     password:'sales123',    role:'sales',      department:'Sales',      active:true },
    { id:'usr_003', name:'ประสิทธิ์ มานะ',  email:'approver@company.com',   password:'approver123', role:'approver',   department:'Management', active:true, approvalLevel:1 },
    { id:'usr_004', name:'สุดา วงศ์สกุล',   email:'approver2@company.com',  password:'approver123', role:'approver',   department:'Management', active:false, approvalLevel:2 },
    { id:'usr_005', name:'มาลี บุญมี',       email:'accounting@company.com', password:'acc123',      role:'accounting', department:'Accounting', active:true },
    { id:'usr_006', name:'Admin ระบบ',       email:'admin@company.com',      password:'admin123',    role:'admin',      department:'IT',         active:true }
  ],

  SEED_CUSTOMERS: [
    { id:'cust_001', code:'C001', name:'บริษัท เอบีซี จำกัด',          taxId:'0105556000001', creditLimit:500000,  currentCredit:150000,  creditTermDays:30, status:'active', riskLevel:'low',    contact:'นายสมศักดิ์ ดีใจ',     phone:'02-000-0001', email:'contact@abc.co.th' },
    { id:'cust_002', code:'C002', name:'บริษัท ดีเอ็กซ์วาย จำกัด',   taxId:'0105556000002', creditLimit:1000000, currentCredit:450000,  creditTermDays:45, status:'active', riskLevel:'medium', contact:'นางสาวรัตนา ดีมาก',   phone:'02-000-0002', email:'contact@dxy.co.th' },
    { id:'cust_003', code:'C003', name:'ห้างหุ้นส่วน เอ็นอีซี',       taxId:'0105556000003', creditLimit:200000,  currentCredit:50000,   creditTermDays:60, status:'active', riskLevel:'low',    contact:'นายวิชัย ก้าวหน้า',   phone:'02-000-0003', email:'contact@nec.co.th' },
    { id:'cust_004', code:'C004', name:'บริษัท เทคโนโลยี พลัส จำกัด', taxId:'0105556000004', creditLimit:2000000, currentCredit:1200000, creditTermDays:30, status:'active', riskLevel:'high',   contact:'นายอนันต์ สุขใจ',     phone:'02-000-0004', email:'contact@techplus.co.th' },
    { id:'cust_005', code:'C005', name:'บริษัท นำโชค เทรดดิ้ง จำกัด', taxId:'0105556000005', creditLimit:750000,  currentCredit:0,       creditTermDays:30, status:'active', riskLevel:'low',    contact:'นางสาวปาริชาต โชคดี', phone:'02-000-0005', email:'contact@namchok.co.th' }
  ],

  SEED_MATRIX: [
    { id:'mat_001', amountFrom:0,      amountTo:100000,   approverLevel:1, description:'วงเงินไม่เกิน 100,000 บาท' },
    { id:'mat_002', amountFrom:100001, amountTo:500000,   approverLevel:1, description:'วงเงิน 100,001 – 500,000 บาท' },
    { id:'mat_003', amountFrom:500001, amountTo:99999999, approverLevel:1, description:'วงเงินมากกว่า 500,000 บาท' }
  ],

  SEED_POLICIES: [
    { id:'pol_001', key:'max_credit_term_days',    value:'90',      label:'จำนวนวันเครดิตสูงสุด',   unit:'วัน' },
    { id:'pol_002', key:'max_payment_term_days',   value:'60',      label:'จำนวนวันชำระเงินสูงสุด', unit:'วัน' },
    { id:'pol_003', key:'auto_approve_limit',      value:'50000',   label:'วงเงินอนุมัติอัตโนมัติ', unit:'บาท' },
    { id:'pol_004', key:'max_credit_per_customer', value:'5000000', label:'วงเงินสูงสุดต่อลูกค้า',  unit:'บาท' }
  ],

  init() {
    if (!localStorage.getItem(PCT.STORAGE.INITIALIZED)) this.reset();
  },

  reset() {
    const now = new Date();
    const d = (days) => new Date(now - days * 86400000).toISOString();
    const requests = [
      { id:'req_001', requestNo:'PCT-2568-0001', type:'credit_term',
        customerId:'cust_001', customerName:'บริษัท เอบีซี จำกัด', customerCode:'C001',
        requestedBy:'usr_001', requestedByName:'สมชาย ใจดี', department:'Sales',
        creditAmount:800000, creditTermDays:60, currentCreditLimit:500000, currentCreditTermDays:30,
        paymentTermDays:null, currentPaymentTermDays:null, paymentMethod:null,
        reason:'ลูกค้าต้องการขยายวงเงินเครดิตเพื่อรองรับการสั่งซื้อที่เพิ่มขึ้นในช่วงไตรมาส 4',
        status:'pending',
        approvals:[{level:1,approverId:null,approverName:null,action:null,comment:'',actionAt:null}],
        accountingStatus:null, accountingNote:'', processedBy:null, processedAt:null,
        createdAt:d(3), updatedAt:d(3) },

      { id:'req_002', requestNo:'PCT-2568-0002', type:'payment_term',
        customerId:'cust_002', customerName:'บริษัท ดีเอ็กซ์วาย จำกัด', customerCode:'C002',
        requestedBy:'usr_001', requestedByName:'สมชาย ใจดี', department:'Sales',
        paymentTermDays:45, currentPaymentTermDays:30, paymentMethod:'transfer',
        creditAmount:null, creditTermDays:null, currentCreditLimit:null, currentCreditTermDays:null,
        reason:'ลูกค้าขอขยายระยะเวลาชำระเงินเนื่องจากสภาพคล่องในช่วงนี้',
        status:'approved',
        approvals:[{level:1,approverId:'usr_003',approverName:'ประสิทธิ์ มานะ',action:'approve',comment:'อนุมัติตามที่ร้องขอ ลูกค้ามีประวัติชำระดีตลอด',actionAt:d(1)}],
        accountingStatus:null, accountingNote:'', processedBy:null, processedAt:null,
        createdAt:d(5), updatedAt:d(1) },

      { id:'req_003', requestNo:'PCT-2568-0003', type:'both',
        customerId:'cust_003', customerName:'ห้างหุ้นส่วน เอ็นอีซี', customerCode:'C003',
        requestedBy:'usr_002', requestedByName:'วิภา รักดี', department:'Sales',
        paymentTermDays:60, currentPaymentTermDays:30, paymentMethod:'cheque',
        creditAmount:300000, creditTermDays:60, currentCreditLimit:200000, currentCreditTermDays:30,
        reason:'ลูกค้าขยายธุรกิจและต้องการปรับเงื่อนไขทั้งระยะเวลาชำระและวงเงินเครดิต',
        status:'rejected',
        approvals:[{level:1,approverId:'usr_003',approverName:'ประสิทธิ์ มานะ',action:'reject',comment:'วงเงินที่ขอสูงเกินไปเมื่อเทียบกับขนาดธุรกิจ ขอให้ปรับลดและส่งใหม่',actionAt:d(2)}],
        accountingStatus:null, accountingNote:'', processedBy:null, processedAt:null,
        createdAt:d(7), updatedAt:d(2) },

      { id:'req_004', requestNo:'PCT-2568-0004', type:'credit_term',
        customerId:'cust_004', customerName:'บริษัท เทคโนโลยี พลัส จำกัด', customerCode:'C004',
        requestedBy:'usr_001', requestedByName:'สมชาย ใจดี', department:'Sales',
        creditAmount:2500000, creditTermDays:45, currentCreditLimit:2000000, currentCreditTermDays:30,
        paymentTermDays:null, currentPaymentTermDays:null, paymentMethod:null,
        reason:'ลูกค้าใหญ่มียอดสั่งซื้อเพิ่มขึ้น 25% ต้องการเพิ่มวงเงินรองรับ',
        status:'processed',
        approvals:[{level:1,approverId:'usr_003',approverName:'ประสิทธิ์ มานะ',action:'approve',comment:'อนุมัติ ลูกค้า Key Account มียอดดีต่อเนื่อง',actionAt:d(8)}],
        accountingStatus:'processed', accountingNote:'ดำเนินการอัปเดตวงเงินในระบบบัญชีแล้ว', processedBy:'usr_005', processedAt:d(7),
        createdAt:d(10), updatedAt:d(7) },

      { id:'req_005', requestNo:'PCT-2568-0005', type:'payment_term',
        customerId:'cust_005', customerName:'บริษัท นำโชค เทรดดิ้ง จำกัด', customerCode:'C005',
        requestedBy:'usr_002', requestedByName:'วิภา รักดี', department:'Sales',
        paymentTermDays:30, currentPaymentTermDays:15, paymentMethod:'transfer',
        creditAmount:null, creditTermDays:null, currentCreditLimit:null, currentCreditTermDays:null,
        reason:'ลูกค้าใหม่ขอขยายเทอมชำระจาก 15 เป็น 30 วัน',
        status:'pending',
        approvals:[{level:1,approverId:null,approverName:null,action:null,comment:'',actionAt:null}],
        accountingStatus:null, accountingNote:'', processedBy:null, processedAt:null,
        createdAt:d(1), updatedAt:d(1) }
    ];
    localStorage.setItem(PCT.STORAGE.USERS,     JSON.stringify(this.SEED_USERS));
    localStorage.setItem(PCT.STORAGE.CUSTOMERS, JSON.stringify(this.SEED_CUSTOMERS));
    localStorage.setItem(PCT.STORAGE.MATRIX,    JSON.stringify(this.SEED_MATRIX));
    localStorage.setItem(PCT.STORAGE.POLICIES,  JSON.stringify(this.SEED_POLICIES));
    localStorage.setItem(PCT.STORAGE.REQUESTS,  JSON.stringify(requests));
    localStorage.setItem(PCT.STORAGE.INITIALIZED, '1');
  },

  _get(key)  { try { return JSON.parse(localStorage.getItem(key)) || []; } catch { return []; } },
  _set(key, d) { localStorage.setItem(key, JSON.stringify(d)); },

  /* Users */
  getUsers()           { return this._get(PCT.STORAGE.USERS); },
  getUserById(id)      { return this.getUsers().find(u => u.id === id); },
  getUserByEmail(e)    { return this.getUsers().find(u => u.email === e); },
  saveUser(user) {
    const list = this.getUsers(), idx = list.findIndex(u => u.id === user.id);
    if (idx >= 0) list[idx] = user; else list.push(user);
    this._set(PCT.STORAGE.USERS, list);
  },
  deleteUser(id) { this._set(PCT.STORAGE.USERS, this.getUsers().filter(u => u.id !== id)); },

  /* Customers */
  getCustomers()       { return this._get(PCT.STORAGE.CUSTOMERS); },
  getCustomerById(id)  { return this.getCustomers().find(c => c.id === id); },
  saveCustomer(c) {
    const list = this.getCustomers(), idx = list.findIndex(x => x.id === c.id);
    if (idx >= 0) list[idx] = c; else list.push(c);
    this._set(PCT.STORAGE.CUSTOMERS, list);
  },
  deleteCustomer(id) { this._set(PCT.STORAGE.CUSTOMERS, this.getCustomers().filter(c => c.id !== id)); },

  /* Requests */
  getRequests()        { return this._get(PCT.STORAGE.REQUESTS); },
  getRequestById(id)   { return this.getRequests().find(r => r.id === id); },
  saveRequest(req) {
    const list = this.getRequests(), idx = list.findIndex(r => r.id === req.id);
    req.updatedAt = new Date().toISOString();
    if (idx >= 0) list[idx] = req; else list.push(req);
    this._set(PCT.STORAGE.REQUESTS, list);
  },
  deleteRequest(id) { this._set(PCT.STORAGE.REQUESTS, this.getRequests().filter(r => r.id !== id)); },

  /* Matrix */
  getMatrix()    { return this._get(PCT.STORAGE.MATRIX); },
  saveMatrix(m) {
    const list = this.getMatrix(), idx = list.findIndex(x => x.id === m.id);
    if (idx >= 0) list[idx] = m; else list.push(m);
    this._set(PCT.STORAGE.MATRIX, list);
  },
  deleteMatrix(id) { this._set(PCT.STORAGE.MATRIX, this.getMatrix().filter(m => m.id !== id)); },

  /* Policies */
  getPolicies()  { return this._get(PCT.STORAGE.POLICIES); },
  savePolicy(p) {
    const list = this.getPolicies(), idx = list.findIndex(x => x.id === p.id);
    if (idx >= 0) list[idx] = p; else list.push(p);
    this._set(PCT.STORAGE.POLICIES, list);
  },

  getStats() {
    const r = this.getRequests();
    return {
      total:     r.length,
      pending:   r.filter(x => x.status==='pending').length,
      approved:  r.filter(x => x.status==='approved').length,
      rejected:  r.filter(x => x.status==='rejected').length,
      processed: r.filter(x => x.status==='processed').length
    };
  }
};
