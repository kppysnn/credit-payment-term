/* Create Request — proposal + quotation form */
PCT.Pages.RequestCreate = {
  title: 'สร้างคำขอใหม่',
  _step: 1,
  _data: {},

  render() {
    const steps = ['ประเภทขาย', 'Proposal & ลูกค้า', 'ราคาและงวด'];
    return `
      ${PCT.UI.pageHeader({
        title: 'สร้างคำขอใหม่',
        subtitle: 'กรอกเฉพาะ proposal, ลูกค้า, ราคา และเงื่อนไขงวดที่ต้องอนุมัติ',
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
                ['hardware', 'Hardware', 'สร้าง Quotation-1 สำหรับ Hardware'],
                ['software_installation', 'Software & Installation', 'สร้าง Quotation-2 สำหรับ Software และ Installation']
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

            <div class="section-label">Proposal</div>
            <div class="form-group mb-4">
              <label class="form-label" for="proposal-no">หมายเลข Proposal <span class="required">*</span></label>
              <input class="form-control" id="proposal-no" placeholder="เช่น PP-2026-0012" value="${PCT.Utils.escapeHtml(this._data.proposalNo||'')}" />
            </div>

            <div class="section-label">เลือกลูกค้า</div>
            <div class="radio-group mb-4" id="customer-mode-group">
              ${[
                ['new_customer', 'ลูกค้าใหม่', 'กรอกชื่อบริษัท'],
                ['existing_customer', 'ลูกค้าเก่า', 'เลือกจากฐานข้อมูลลูกค้า'],
                ['reseller', 'Reseller', 'กรอก reseller และลูกค้าปลายทาง']
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
          <div class="td-mono" style="font-size:.8rem;color:var(--navy);margin-top:2px">${PCT.Utils.escapeHtml(this._data.quotationRef || '')}</div>
        </div>
        ${this._data.proposalNo ? `<div style="font-size:.8rem;color:var(--text-secondary)">Proposal: <span class="td-mono" style="color:var(--ink)">${PCT.Utils.escapeHtml(this._data.proposalNo)}</span></div>` : ''}
      </div>`;
    const bar2 = document.getElementById('step2-quote-bar');
    const bar3 = document.getElementById('step3-quote-bar');
    if (bar2) bar2.innerHTML = html;
    if (bar3) bar3.innerHTML = html;
  },

  _buildCustomerForm() {
    document.getElementById('customer-form-wrap').innerHTML = `
      <div id="new-customer-form" style="display:none">
        <div class="form-group">
          <label class="form-label" for="new-customer-name">บริษัท <span class="required">*</span></label>
          <input class="form-control" id="new-customer-name" placeholder="ชื่อบริษัท" value="${PCT.Utils.escapeHtml(this._data.customerName||'')}" />
        </div>
      </div>

      <div id="existing-customer-form" style="display:none">
        <div class="form-group">
          <label class="form-label" for="existing-customer-id">ลูกค้าเก่า <span class="required">*</span></label>
          <select class="form-control" id="existing-customer-id">
            <option value="">เลือกลูกค้า...</option>
            ${PCT.Data.getCustomers().filter(c=>c.status==='active').map(c=>`
              <option value="${c.id}" ${this._data.customerId===c.id?'selected':''}>${PCT.Utils.escapeHtml(c.name)} (${PCT.Utils.escapeHtml(c.code)})</option>`).join('')}
          </select>
        </div>
      </div>

      <div id="reseller-form" style="display:none">
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label" for="reseller-customer-name">ลูกค้า / Reseller <span class="required">*</span></label>
            <input class="form-control" id="reseller-customer-name" placeholder="ชื่อ reseller" value="${PCT.Utils.escapeHtml(this._data.resellerName||'')}" />
          </div>
          <div class="form-group">
            <label class="form-label" for="end-customer-name">ลูกค้าปลายทาง <span class="required">*</span></label>
            <input class="form-control" id="end-customer-name" placeholder="ชื่อลูกค้าปลายทาง" value="${PCT.Utils.escapeHtml(this._data.endCustomerName||'')}" />
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
  },

  _toggleCustomerMode() {
    document.getElementById('new-customer-form').style.display = this._data.customerMode === 'new_customer' ? 'block' : 'none';
    document.getElementById('existing-customer-form').style.display = this._data.customerMode === 'existing_customer' ? 'block' : 'none';
    document.getElementById('reseller-form').style.display = this._data.customerMode === 'reseller' ? 'block' : 'none';
  },

  _step2Next() {
    const proposalNo = document.getElementById('proposal-no').value.trim();
    if (!proposalNo) {
      PCT.UI.toast('กรุณากรอกหมายเลข Proposal', 'warning');
      return;
    }
    if (!this._data.customerMode) {
      PCT.UI.toast('กรุณาเลือกรูปแบบลูกค้า', 'warning');
      return;
    }

    this._data.proposalNo = proposalNo;

    if (this._data.customerMode === 'new_customer') {
      const name = document.getElementById('new-customer-name').value.trim();
      if (!name) {
        PCT.UI.toast('กรุณากรอกชื่อบริษัท', 'warning');
        return;
      }
      this._data.customerName = name;
      this._data.customerCode = 'NEW';
      this._data.customerId = 'new_' + PCT.Utils.uid();
      this._data.customer = null;
    }

    if (this._data.customerMode === 'existing_customer') {
      const customerId = document.getElementById('existing-customer-id').value;
      const customer = PCT.Data.getCustomerById(customerId);
      if (!customer) {
        PCT.UI.toast('กรุณาเลือกลูกค้าเก่า', 'warning');
        return;
      }
      this._data.customerId = customer.id;
      this._data.customerName = customer.name;
      this._data.customerCode = customer.code;
      this._data.customer = customer;
    }

    if (this._data.customerMode === 'reseller') {
      const resellerName = document.getElementById('reseller-customer-name').value.trim();
      const endCustomerName = document.getElementById('end-customer-name').value.trim();
      if (!resellerName || !endCustomerName) {
        PCT.UI.toast('กรุณากรอก reseller และลูกค้าปลายทาง', 'warning');
        return;
      }
      this._data.resellerName = resellerName;
      this._data.endCustomerName = endCustomerName;
      this._data.customerName = resellerName;
      this._data.customerCode = 'RESELLER';
      this._data.customerId = 'reseller_' + PCT.Utils.uid();
      this._data.customer = null;
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

    const priceFields = isHardware ? `
      <div class="section-label">Quotation-1 (Hardware)</div>
      <div class="form-grid mb-4">
        <div class="form-group">
          <label class="form-label" for="hardware-sale-price">ราคาขาย HW <span class="required">*</span></label>
          <div class="input-group"><input class="form-control js-total-input" type="number" id="hardware-sale-price" min="0" step="1000" placeholder="0" value="${this._data.hardwareSalePrice||''}" /><span class="input-addon">THB</span></div>
        </div>
        <div class="form-group">
          <label class="form-label" for="hardware-cost-price">ราคาต้นทุน HW <span class="required">*</span></label>
          <div class="input-group"><input class="form-control js-total-input" type="number" id="hardware-cost-price" min="0" step="1000" placeholder="0" value="${this._data.hardwareCostPrice||''}" /><span class="input-addon">THB</span></div>
        </div>
      </div>` : `
      <div class="section-label">Quotation-2 (Software & Installation)</div>
      <div class="form-grid mb-4">
        <div class="form-group">
          <label class="form-label" for="software-sale-price">ราคาขาย SW <span class="required">*</span></label>
          <div class="input-group"><input class="form-control js-total-input" type="number" id="software-sale-price" min="0" step="1000" placeholder="0" value="${this._data.softwareSalePrice||''}" /><span class="input-addon">THB</span></div>
        </div>
        <div class="form-group">
          <label class="form-label" for="software-cost-price">ราคาต้นทุน SW <span class="required">*</span></label>
          <div class="input-group"><input class="form-control js-total-input" type="number" id="software-cost-price" min="0" step="1000" placeholder="0" value="${this._data.softwareCostPrice||''}" /><span class="input-addon">THB</span></div>
        </div>
        <div class="form-group">
          <label class="form-label" for="installation-sale-price">ราคาขาย Install. <span class="required">*</span></label>
          <div class="input-group"><input class="form-control js-total-input" type="number" id="installation-sale-price" min="0" step="1000" placeholder="0" value="${this._data.installationSalePrice||''}" /><span class="input-addon">THB</span></div>
        </div>
        <div class="form-group">
          <label class="form-label" for="installation-cost-price">ราคาต้นทุน Install. <span class="required">*</span></label>
          <div class="input-group"><input class="form-control js-total-input" type="number" id="installation-cost-price" min="0" step="1000" placeholder="0" value="${this._data.installationCostPrice||''}" /><span class="input-addon">THB</span></div>
        </div>
      </div>`;

    document.getElementById('line-item-form').innerHTML = `
      <div style="background:var(--surface-2);border:1px solid var(--border);border-radius:var(--radius);padding:12px 16px;margin-bottom:20px">
        <div class="info-item-label">ลูกค้า</div>
        <div class="info-item-value">${customerLine}</div>
      </div>

      ${priceFields}

      <div class="section-label">งวดชำระ</div>
      <div class="form-group mb-4" style="max-width:260px">
        <label class="form-label" for="installment-count">จำนวนงวด <span class="required">*</span></label>
        <div class="input-group">
          <input class="form-control" type="number" id="installment-count" min="1" max="4" value="${this._data.installmentCount||1}" />
          <span class="input-addon">งวด</span>
        </div>
        <div class="form-hint">สูงสุด 4 งวด และเปอร์เซ็นต์รวมต้องเป็น 100%</div>
      </div>
      <div id="installment-plan-wrap"></div>

      <div class="card" style="background:var(--surface-2);box-shadow:none;margin-top:18px">
        <div class="card-body">
          <div class="section-label" style="margin-bottom:10px">สรุปรวมทั้งหมด</div>
          <div class="info-grid">
            <div><div class="info-item-label">Quotation</div><div class="info-item-value td-mono">${PCT.Utils.escapeHtml(this._data.quotationRef)}</div></div>
            <div><div class="info-item-label">Proposal</div><div class="info-item-value td-mono">${PCT.Utils.escapeHtml(this._data.proposalNo)}</div></div>
            <div><div class="info-item-label">ขายรวม</div><div class="info-item-value" id="total-sale-preview" style="font-size:1.12rem;color:var(--navy);font-weight:700">฿0</div></div>
            <div><div class="info-item-label">ต้นทุนรวม</div><div class="info-item-value" id="total-cost-preview">฿0</div></div>
          </div>
        </div>
      </div>`;

    this._bindLineItemEvents();
  },

  _bindLineItemEvents() {
    const countEl = document.getElementById('installment-count');
    countEl.addEventListener('input', () => this._renderInstallments(true));
    document.querySelectorAll('.js-total-input').forEach(el => el.addEventListener('input', () => this._updateTotals()));
    this._renderInstallments(false);
    this._updateTotals();
  },

  _renderInstallments(redistribute) {
    const countEl = document.getElementById('installment-count');
    let count = parseInt(countEl.value) || 1;
    count = Math.max(1, Math.min(4, count));
    countEl.value = count;

    const oldPlan = this._readInstallmentPlan(false);
    const plan = [];
    const basePct = Math.floor(100 / count);
    const remainder = 100 - (basePct * count);
    for (let i = 0; i < count; i++) {
      const old = oldPlan[i] || {};
      plan.push({
        percent: redistribute ? basePct + (i === count - 1 ? remainder : 0) : (old.percent || basePct + (i === count - 1 ? remainder : 0)),
        creditDays: old.creditDays || 0,
        creditReason: old.creditReason || ''
      });
    }

    document.getElementById('installment-plan-wrap').innerHTML = `
      <div class="table-container" style="border-radius:var(--radius);overflow:hidden">
        <table class="data-table">
          <thead><tr><th>งวด</th><th>%</th><th>Credit</th><th>เพราะอะไร</th></tr></thead>
          <tbody>
            ${plan.map((p,i)=>`
              <tr>
                <td class="td-bold">งวด ${i+1}</td>
                <td style="width:130px"><div class="input-group"><input class="form-control installment-percent" type="number" min="0" max="100" step="1" value="${p.percent}" /><span class="input-addon">%</span></div></td>
                <td style="width:150px"><div class="input-group"><input class="form-control installment-credit" type="number" min="0" max="180" step="1" value="${p.creditDays}" /><span class="input-addon">วัน</span></div></td>
                <td><input class="form-control installment-reason" placeholder="เหตุผลของ credit งวดนี้" value="${PCT.Utils.escapeHtml(p.creditReason)}" /></td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
      <div class="form-hint" id="installment-total-hint" style="margin-top:8px"></div>`;

    document.querySelectorAll('.installment-percent,.installment-credit,.installment-reason').forEach(el => {
      el.addEventListener('input', () => this._updateInstallmentHint());
    });
    this._updateInstallmentHint();
  },

  _updateInstallmentHint() {
    const total = this._readInstallmentPlan(false).reduce((sum, row) => sum + row.percent, 0);
    const hint = document.getElementById('installment-total-hint');
    if (!hint) return;
    hint.textContent = `รวม ${total}%`;
    hint.style.color = total === 100 ? 'var(--success)' : 'var(--error)';
  },

  _readInstallmentPlan(requireReason) {
    return [...document.querySelectorAll('#installment-plan-wrap tbody tr')].map((row, i) => {
      const percent = parseFloat(row.querySelector('.installment-percent')?.value) || 0;
      const creditDays = parseInt(row.querySelector('.installment-credit')?.value) || 0;
      const creditReason = row.querySelector('.installment-reason')?.value.trim() || '';
      if (requireReason && creditDays > 0 && !creditReason) {
        throw new Error(`กรุณาระบุเหตุผล credit ของงวด ${i + 1}`);
      }
      return { installmentNo: i + 1, percent, creditDays, creditReason };
    });
  },

  _getNumber(id) {
    return parseFloat(document.getElementById(id)?.value) || 0;
  },

  _priceTotals() {
    if (this._data.type === 'hardware') {
      return {
        sale: this._getNumber('hardware-sale-price'),
        cost: this._getNumber('hardware-cost-price'),
        hardwareSalePrice: this._getNumber('hardware-sale-price'),
        hardwareCostPrice: this._getNumber('hardware-cost-price')
      };
    }
    const softwareSalePrice = this._getNumber('software-sale-price');
    const softwareCostPrice = this._getNumber('software-cost-price');
    const installationSalePrice = this._getNumber('installation-sale-price');
    const installationCostPrice = this._getNumber('installation-cost-price');
    return {
      sale: softwareSalePrice + installationSalePrice,
      cost: softwareCostPrice + installationCostPrice,
      softwareSalePrice,
      softwareCostPrice,
      installationSalePrice,
      installationCostPrice
    };
  },

  _updateTotals() {
    const totals = this._priceTotals();
    const saleEl = document.getElementById('total-sale-preview');
    const costEl = document.getElementById('total-cost-preview');
    if (saleEl) saleEl.textContent = PCT.Utils.formatCurrency(totals.sale);
    if (costEl) costEl.textContent = PCT.Utils.formatCurrency(totals.cost);
  },

  _validateLineItem() {
    const totals = this._priceTotals();
    const installmentCount = parseInt(document.getElementById('installment-count').value) || 0;

    if (this._data.type === 'hardware') {
      if (!totals.hardwareSalePrice || !totals.hardwareCostPrice) {
        PCT.UI.toast('กรุณากรอกราคาขายและราคาต้นทุน HW', 'warning');
        return false;
      }
    } else {
      if (!totals.softwareSalePrice || !totals.softwareCostPrice || !totals.installationSalePrice || !totals.installationCostPrice) {
        PCT.UI.toast('กรุณากรอกราคาขายและต้นทุนของ SW และ Install.', 'warning');
        return false;
      }
    }

    if (installmentCount < 1 || installmentCount > 4) {
      PCT.UI.toast('จำนวนงวดต้องอยู่ระหว่าง 1-4 งวด', 'warning');
      return false;
    }

    let installmentPlan;
    try {
      installmentPlan = this._readInstallmentPlan(true);
    } catch (err) {
      PCT.UI.toast(err.message, 'warning');
      return false;
    }

    const pctTotal = installmentPlan.reduce((sum, row) => sum + row.percent, 0);
    if (pctTotal !== 100) {
      PCT.UI.toast(`เปอร์เซ็นต์งวดรวมต้องเป็น 100% ตอนนี้รวม ${pctTotal}%`, 'warning');
      return false;
    }

    Object.assign(this._data, totals, {
      salePrice: totals.sale,
      costPrice: totals.cost,
      dealValue: totals.sale,
      installmentCount,
      installmentPlan
    });
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
      proposalNo: this._data.proposalNo,
      customerMode: this._data.customerMode,
      customerId: this._data.customerId,
      customerName: this._data.customerName,
      customerCode: this._data.customerCode,
      resellerName: this._data.resellerName || '',
      endCustomerName: this._data.endCustomerName || '',
      requestedBy: user.id,
      requestedByName: user.name,
      department: user.department || '',
      quotationRef: this._data.quotationRef,
      dealTitle: `${this._saleTypeLabel(this._data.type)} ${this._data.quotationRef}`,
      dealValue: this._data.salePrice,
      dealCategories: [this._data.type === 'hardware' ? 'hardware' : 'software', ...(this._data.type === 'software_installation' ? ['installation'] : [])],
      hardwareSalePrice: this._data.hardwareSalePrice || null,
      hardwareCostPrice: this._data.hardwareCostPrice || null,
      softwareSalePrice: this._data.softwareSalePrice || null,
      softwareCostPrice: this._data.softwareCostPrice || null,
      installationSalePrice: this._data.installationSalePrice || null,
      installationCostPrice: this._data.installationCostPrice || null,
      costPrice: this._data.costPrice,
      salePrice: this._data.salePrice,
      installmentCount: this._data.installmentCount,
      installmentPlan: this._data.installmentPlan,
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
