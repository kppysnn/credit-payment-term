/* Create Request — lazy-first 3-step form */
PCT.Pages.RequestCreate = {
  title: 'สร้างคำขอใหม่',
  _step: 1,
  _data: {},

  render() {
    const steps = ['ประเภทขาย', 'ลูกค้า', 'รายการ'];
    return `
      ${PCT.UI.pageHeader({
        title: 'สร้างคำขอใหม่',
        subtitle: 'ฟอร์มแบบสั้น กรอกเฉพาะข้อมูลที่จำเป็นต่อการเปิดคำขอ',
        breadcrumb: [{label:'Dashboard',route:'dashboard'},{label:'คำขอ',route:'requests'},{label:'สร้างใหม่',route:'request-create'}]
      })}

      <div class="card">
        <div class="card-body">
          <div class="step-wizard mb-6">
            <div class="step-track">
              ${steps.map((l,i)=>`
                <div class="step-item" id="step-item-${i+1}">
                  <div class="step-circle step-num">${i+1}</div>
                  <div class="step-label">${l}</div>
                </div>`).join('')}
            </div>
          </div>

          <div class="step-content" id="step-1">
            <div class="section-label">เลือกประเภทการขาย</div>
            <div class="radio-group" id="sale-type-group">
              ${[
                ['hardware', 'Hardware', 'ระบบจะใช้เลข Quotation ชุด -1 สำหรับรายการ Hardware'],
                ['software_installation', 'Software & Installation', 'ระบบจะใช้เลข Quotation ชุด -2 สำหรับ Software และงานติดตั้ง']
              ].map(([v,t,d])=>`
                <label class="radio-card" data-val="${v}">
                  <input type="radio" name="sale-type" value="${v}" />
                  <div class="radio-check"></div>
                  <div class="radio-card-content">
                    <div class="radio-card-title">${t}</div>
                    <div class="radio-card-desc">${d}</div>
                  </div>
                </label>`).join('')}
            </div>

            <div id="quote-preview" style="display:none;background:var(--surface-2);border:1px solid var(--border);border-radius:var(--radius);padding:14px 16px;margin-top:18px">
              <div class="info-item-label">Quotation ที่ระบบสร้างให้</div>
              <div class="info-item-value td-mono" id="quote-preview-no" style="font-size:1rem;color:var(--navy);font-weight:700"></div>
            </div>

            <div class="step-nav">
              <div></div>
              <button class="btn btn-primary" id="step1-next">ถัดไป ${PCT.Icons.chevronRight}</button>
            </div>
          </div>

          <div class="step-content" id="step-2">
            <div id="step2-quote-bar"></div>

            <div class="section-label">ลูกค้า</div>
            <div class="radio-group mb-4" id="customer-mode-group">
              ${[
                ['new_customer', 'ลูกค้าใหม่', 'กรอกแค่ชื่อลูกค้าและผู้ติดต่อ'],
                ['reseller', 'Reseller', 'เลือก reseller จากฐานข้อมูล แล้วกรอกลูกค้าปลายทาง']
              ].map(([v,t,d])=>`
                <label class="radio-card compact" data-val="${v}">
                  <input type="radio" name="customer-mode" value="${v}" />
                  <div class="radio-check"></div>
                  <div class="radio-card-content">
                    <div class="radio-card-title">${t}</div>
                    <div class="radio-card-desc">${d}</div>
                  </div>
                </label>`).join('')}
            </div>

            <div id="customer-form-wrap"></div>

            <div class="step-nav">
              <button class="btn btn-secondary" id="step2-prev">${PCT.Icons.chevronLeft} ย้อนกลับ</button>
              <button class="btn btn-primary" id="step2-next">ถัดไป ${PCT.Icons.chevronRight}</button>
            </div>
          </div>

          <div class="step-content" id="step-3">
            <div id="step3-quote-bar"></div>
            <div id="line-item-form"></div>

            <div class="step-nav">
              <button class="btn btn-secondary" id="step3-prev">${PCT.Icons.chevronLeft} ย้อนกลับ</button>
              <div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:flex-end">
                <button class="btn btn-secondary" id="step3-draft">${PCT.Icons.edit} บันทึกร่าง</button>
                <button class="btn btn-primary btn-lg" id="step3-submit">${PCT.Icons.check} ส่งคำขอ</button>
              </div>
            </div>
          </div>
        </div>
      </div>`;
  },

  init() {
    this._step = 1;
    this._data = {};
    this._goStep(1);

    document.querySelectorAll('#sale-type-group .radio-card[data-val]').forEach(card => {
      card.addEventListener('click', () => {
        document.querySelectorAll('#sale-type-group .radio-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        card.querySelector('input').checked = true;
        this._data.type = card.dataset.val;
        this._data.quotationRef = this._makeQuotationRef(card.dataset.val);
        document.getElementById('quote-preview').style.display = 'block';
        document.getElementById('quote-preview-no').textContent = this._data.quotationRef;
      });
    });

    document.getElementById('step1-next').onclick = () => this._step1Next();
    document.getElementById('step2-prev').onclick = () => this._goStep(1);
    document.getElementById('step2-next').onclick = () => this._step2Next();
    document.getElementById('step3-prev').onclick = () => this._goStep(2);
    document.getElementById('step3-draft').onclick = () => this._submitAs('draft');
    document.getElementById('step3-submit').onclick = () => this._submitAs('pending');
  },

  _makeQuotationRef(type) {
    const base = PCT.Utils.genReqNo().replace('PCT-', 'QT-');
    return `${base}-${type === 'hardware' ? '1' : '2'}`;
  },

  _saleTypeLabel(type) {
    return type === 'hardware' ? 'Hardware' : 'Software & Installation';
  },

  _step1Next() {
    if (!this._data.type) {
      PCT.UI.toast('กรุณาเลือกประเภทการขาย', 'warning');
      return;
    }
    this._buildQuoteBars();
    this._buildCustomerForm();
    this._goStep(2);
  },

  _buildQuoteBars() {
    const html = `
      <div style="background:var(--surface-2);border:1px solid var(--border);border-radius:var(--radius);padding:12px 16px;margin-bottom:20px;display:flex;align-items:center;gap:12px;flex-wrap:wrap">
        <div class="user-avatar" style="border-radius:var(--radius-sm);background:var(--gradient-primary);flex-shrink:0">QT</div>
        <div style="flex:1;min-width:220px">
          <div style="font-weight:700;color:var(--ink);font-size:.9rem">${this._saleTypeLabel(this._data.type)}</div>
          <div class="td-mono" style="font-size:.8rem;color:var(--navy);margin-top:2px">${PCT.Utils.escapeHtml(this._data.quotationRef)}</div>
        </div>
      </div>`;
    const bar2 = document.getElementById('step2-quote-bar');
    const bar3 = document.getElementById('step3-quote-bar');
    if (bar2) bar2.innerHTML = html;
    if (bar3) bar3.innerHTML = html;
  },

  _buildCustomerForm() {
    document.getElementById('customer-form-wrap').innerHTML = `
      <div id="new-customer-form" style="display:none">
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label" for="new-customer-name">ชื่อลูกค้า <span class="required">*</span></label>
            <input class="form-control" id="new-customer-name" placeholder="เช่น บริษัท เอบีซี จำกัด" value="${PCT.Utils.escapeHtml(this._data.customerName||'')}" />
          </div>
          <div class="form-group">
            <label class="form-label" for="new-customer-contact">ผู้ติดต่อ <span class="required">*</span></label>
            <input class="form-control" id="new-customer-contact" placeholder="ชื่อผู้ติดต่อ" value="${PCT.Utils.escapeHtml(this._data.customerContact||'')}" />
          </div>
        </div>
      </div>

      <div id="reseller-form" style="display:none">
        <div class="form-group mb-4">
          <label class="form-label" for="reseller-id">Reseller <span class="required">*</span></label>
          <select class="form-control" id="reseller-id">
            <option value="">เลือก reseller...</option>
            ${PCT.Data.getCustomers().filter(c=>c.status==='active').map(c=>`
              <option value="${c.id}" ${this._data.resellerId===c.id?'selected':''}>${PCT.Utils.escapeHtml(c.name)} (${PCT.Utils.escapeHtml(c.code)})</option>`).join('')}
          </select>
        </div>
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label" for="end-customer-name">ลูกค้าปลายทาง <span class="required">*</span></label>
            <input class="form-control" id="end-customer-name" placeholder="ชื่อลูกค้าปลายทาง" value="${PCT.Utils.escapeHtml(this._data.endCustomerName||'')}" />
          </div>
          <div class="form-group">
            <label class="form-label" for="end-customer-contact">Contact <span class="required">*</span></label>
            <input class="form-control" id="end-customer-contact" placeholder="ชื่อผู้ติดต่อ" value="${PCT.Utils.escapeHtml(this._data.endCustomerContact||'')}" />
          </div>
          <div class="form-group">
            <label class="form-label" for="end-customer-phone">เบอร์โทร <span class="required">*</span></label>
            <input class="form-control" id="end-customer-phone" placeholder="เช่น 02-000-0000" value="${PCT.Utils.escapeHtml(this._data.endCustomerPhone||'')}" />
          </div>
        </div>
      </div>`;

    document.querySelectorAll('#customer-mode-group .radio-card[data-val]').forEach(card => {
      card.addEventListener('click', () => {
        document.querySelectorAll('#customer-mode-group .radio-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        card.querySelector('input').checked = true;
        this._data.customerMode = card.dataset.val;
        this._toggleCustomerMode();
      });
    });

    if (this._data.customerMode) {
      const card = document.querySelector(`#customer-mode-group .radio-card[data-val="${this._data.customerMode}"]`);
      if (card) card.click();
    }
  },

  _toggleCustomerMode() {
    document.getElementById('new-customer-form').style.display = this._data.customerMode === 'new_customer' ? 'block' : 'none';
    document.getElementById('reseller-form').style.display = this._data.customerMode === 'reseller' ? 'block' : 'none';
  },

  _step2Next() {
    if (!this._data.customerMode) {
      PCT.UI.toast('กรุณาเลือกประเภทลูกค้า', 'warning');
      return;
    }

    if (this._data.customerMode === 'new_customer') {
      const name = document.getElementById('new-customer-name').value.trim();
      const contact = document.getElementById('new-customer-contact').value.trim();
      if (!name || !contact) {
        PCT.UI.toast('กรุณากรอกชื่อลูกค้าและผู้ติดต่อ', 'warning');
        return;
      }
      this._data.customerName = name;
      this._data.customerContact = contact;
      this._data.customerCode = 'NEW';
      this._data.customerId = 'new_' + PCT.Utils.uid();
      this._data.customer = null;
    } else {
      const resellerId = document.getElementById('reseller-id').value;
      const endName = document.getElementById('end-customer-name').value.trim();
      const endContact = document.getElementById('end-customer-contact').value.trim();
      const endPhone = document.getElementById('end-customer-phone').value.trim();
      if (!resellerId || !endName || !endContact || !endPhone) {
        PCT.UI.toast('กรุณาเลือก reseller และกรอกข้อมูลลูกค้าปลายทางให้ครบ', 'warning');
        return;
      }
      const reseller = PCT.Data.getCustomerById(resellerId);
      this._data.resellerId = resellerId;
      this._data.resellerName = reseller.name;
      this._data.customerId = reseller.id;
      this._data.customerName = reseller.name;
      this._data.customerCode = reseller.code;
      this._data.customer = reseller;
      this._data.endCustomerName = endName;
      this._data.endCustomerContact = endContact;
      this._data.endCustomerPhone = endPhone;
    }

    this._buildQuoteBars();
    this._buildLineItemForm();
    this._goStep(3);
  },

  _buildLineItemForm() {
    const isHardware = this._data.type === 'hardware';
    const customerLine = this._data.customerMode === 'reseller'
      ? `${PCT.Utils.escapeHtml(this._data.resellerName)} → ${PCT.Utils.escapeHtml(this._data.endCustomerName)}`
      : PCT.Utils.escapeHtml(this._data.customerName);

    const productFields = isHardware ? `
      <div class="section-label">Hardware-1</div>
      <div class="form-grid mb-4">
        <div class="form-group">
          <label class="form-label" for="cost-price">ราคาต้นทุน <span class="required">*</span></label>
          <div class="input-group">
            <input class="form-control" type="number" id="cost-price" min="0" step="1000" placeholder="0" value="${this._data.costPrice||''}" />
            <span class="input-addon">THB</span>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label" for="sale-price">ราคาขาย <span class="required">*</span></label>
          <div class="input-group">
            <input class="form-control" type="number" id="sale-price" min="0" step="1000" placeholder="0" value="${this._data.salePrice||''}" />
            <span class="input-addon">THB</span>
          </div>
        </div>
      </div>` : `
      <div class="section-label">Software & Installation</div>
      <div class="form-grid mb-4">
        <div class="form-group">
          <label class="form-label" for="sale-price">ราคาขาย <span class="required">*</span></label>
          <div class="input-group">
            <input class="form-control" type="number" id="sale-price" min="0" step="1000" placeholder="0" value="${this._data.salePrice||''}" />
            <span class="input-addon">THB</span>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label" for="cost-price">ทุน <span class="required">*</span></label>
          <div class="input-group">
            <input class="form-control" type="number" id="cost-price" min="0" step="1000" placeholder="0" value="${this._data.costPrice||''}" />
            <span class="input-addon">THB</span>
          </div>
        </div>
      </div>`;

    document.getElementById('line-item-form').innerHTML = `
      <div style="background:var(--surface-2);border:1px solid var(--border);border-radius:var(--radius);padding:12px 16px;margin-bottom:20px">
        <div class="info-item-label">ลูกค้า</div>
        <div class="info-item-value">${customerLine}</div>
      </div>

      ${productFields}

      <div class="section-label">งวดชำระ</div>
      <div class="form-grid mb-4">
        <div class="form-group">
          <label class="form-label" for="installment-count">จำนวนงวด <span class="required">*</span></label>
          <div class="input-group">
            <input class="form-control" type="number" id="installment-count" min="1" max="24" placeholder="เช่น 1" value="${this._data.installmentCount||1}" />
            <span class="input-addon">งวด</span>
          </div>
        </div>
        ${isHardware ? '' : `
        <div class="form-group">
          <label class="form-label" for="credit-days">เครดิตภายในงวด</label>
          <div class="input-group">
            <input class="form-control" type="number" id="credit-days" min="0" max="180" placeholder="เช่น 30" value="${this._data.creditDays ?? ''}" />
            <span class="input-addon">วัน</span>
          </div>
        </div>`}
      </div>

      <div class="card" style="background:var(--surface-2);box-shadow:none">
        <div class="card-body">
          <div class="section-label" style="margin-bottom:10px">สรุปก่อนส่ง</div>
          <div class="info-grid">
            <div><div class="info-item-label">Quotation</div><div class="info-item-value td-mono">${PCT.Utils.escapeHtml(this._data.quotationRef)}</div></div>
            <div><div class="info-item-label">ประเภทขาย</div><div class="info-item-value">${this._saleTypeLabel(this._data.type)}</div></div>
            <div><div class="info-item-label">ลูกค้า</div><div class="info-item-value">${customerLine}</div></div>
            <div><div class="info-item-label">สถานะหลังส่ง</div><div class="info-item-value">รอพิจารณา</div></div>
          </div>
        </div>
      </div>`;
  },

  _validateLineItem() {
    const costPrice = parseFloat(document.getElementById('cost-price').value);
    const salePrice = parseFloat(document.getElementById('sale-price').value);
    const installmentCount = parseInt(document.getElementById('installment-count').value);
    if (!costPrice || costPrice <= 0) {
      PCT.UI.toast('กรุณากรอกราคาต้นทุน', 'warning');
      return false;
    }
    if (!salePrice || salePrice <= 0) {
      PCT.UI.toast('กรุณากรอกราคาขาย', 'warning');
      return false;
    }
    if (!installmentCount || installmentCount <= 0) {
      PCT.UI.toast('กรุณากรอกจำนวนงวด', 'warning');
      return false;
    }
    this._data.costPrice = costPrice;
    this._data.salePrice = salePrice;
    this._data.dealValue = salePrice;
    this._data.installmentCount = installmentCount;
    this._data.creditDays = this._data.type === 'software_installation'
      ? (parseInt(document.getElementById('credit-days').value) || 0)
      : null;
    return true;
  },

  _goStep(n) {
    this._step = n;
    for (let i = 1; i <= 3; i++) {
      const content = document.getElementById(`step-${i}`);
      const item = document.getElementById(`step-item-${i}`);
      if (!content || !item) continue;
      content.classList.toggle('active', i === n);
      item.classList.toggle('active', i === n);
      item.classList.toggle('completed', i < n);
      const circle = item.querySelector('.step-circle');
      circle.innerHTML = i < n ? PCT.Icons.check : String(i);
    }
  },

  _submitAs(status) {
    if (!this._validateLineItem()) return;

    const btn = document.getElementById(status === 'draft' ? 'step3-draft' : 'step3-submit');
    btn.disabled = true;
    btn.innerHTML = `<div class="spinner" style="width:16px;height:16px"></div> ${status === 'draft' ? 'กำลังบันทึก...' : 'กำลังส่ง...'}`;

    const user = PCT.Auth.getCurrentUser();
    const now = new Date().toISOString();
    const req = {
      id: 'req_' + PCT.Utils.uid(),
      requestNo: PCT.Utils.genReqNo(),
      type: this._data.type,
      customerMode: this._data.customerMode,
      customerId: this._data.customerId,
      customerName: this._data.customerName,
      customerCode: this._data.customerCode,
      customerContact: this._data.customerContact || '',
      resellerId: this._data.resellerId || null,
      resellerName: this._data.resellerName || '',
      endCustomerName: this._data.endCustomerName || '',
      endCustomerContact: this._data.endCustomerContact || '',
      endCustomerPhone: this._data.endCustomerPhone || '',
      requestedBy: user.id,
      requestedByName: user.name,
      department: user.department || '',
      quotationRef: this._data.quotationRef,
      dealTitle: `${this._saleTypeLabel(this._data.type)} ${this._data.quotationRef}`,
      dealValue: this._data.salePrice,
      dealCategories: [this._data.type === 'hardware' ? 'hardware' : 'software', ...(this._data.type === 'software_installation' ? ['installation'] : [])],
      costPrice: this._data.costPrice,
      salePrice: this._data.salePrice,
      installmentCount: this._data.installmentCount,
      creditDays: this._data.creditDays,
      reason: '',
      notes: '',
      riskAssessment: 'low',
      status,
      approvals: [{ level:1, approverId:null, approverName:null, action:null, comment:'', actionAt:null }],
      accountingStatus: null,
      accountingNote: '',
      processedBy: null,
      processedAt: null,
      createdAt: now,
      updatedAt: now
    };

    setTimeout(() => {
      PCT.Data.saveRequest(req);
      PCT.UI.toast(status === 'draft' ? 'บันทึกร่างเรียบร้อยแล้ว' : 'ส่งคำขอสำเร็จ', 'success', req.quotationRef);
      PCT.Router.navigate('request-detail', { id: req.id });
    }, 300);
  }
};
