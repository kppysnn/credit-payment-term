/* Request Detail */
PCT.Pages.RequestDetail = {
  title: 'รายละเอียดคำขอ',
  _reqId: null,

  render(params) {
    this._reqId = params && params.id;
    const req = PCT.Data.getRequestById(this._reqId);
    if (!req) return `<div class="empty-state"><div class="empty-icon">${PCT.Icons.alertTriangle}</div><div class="empty-title">ไม่พบคำขอ</div></div>`;

    const user = PCT.Auth.getCurrentUser();
    const canApprove  = user.role === 'approver'   && req.status === 'pending';
    const canProcess  = user.role === 'accounting'  && req.status === 'approved';
    const canCancel   = user.role === 'sales'       && (req.status === 'draft' || req.status === 'revision_needed') && req.requestedBy === user.id;
    const canResubmit = user.role === 'sales'       && req.status === 'revision_needed' && req.requestedBy === user.id;

    const isSimpleSale = req.type === 'hardware' || req.type === 'software_installation';

    /* Category labels */
    const catLabels = { hardware:'Hardware', software:'Software', installation:'Installation', maintenance:'Maintenance' };

    const installmentRows = (req.installmentPlan || []).map(row => `
      <tr>
        <td class="td-bold">งวด ${row.installmentNo}</td>
        <td>${row.percent}%</td>
        <td>${row.creditDays || 0} วัน</td>
        <td>${PCT.Utils.escapeHtml(row.creditReason || '—')}</td>
      </tr>`).join('');

    const simpleSaleTerms = isSimpleSale ? `
      <div class="section-label">${req.type === 'hardware' ? 'Quotation-1 (Hardware)' : 'Quotation-2 (Software & Installation)'}</div>
      <div class="info-grid mb-4">
        <div><div class="info-item-label">เลข Proposal</div><div class="info-item-value td-mono">${PCT.Utils.escapeHtml(req.proposalNo || '—')}</div></div>
        <div><div class="info-item-label">เลข Quotation</div><div class="info-item-value td-mono" style="color:var(--navy);font-weight:700">${PCT.Utils.escapeHtml(req.quotationRef || '—')}</div></div>
        <div><div class="info-item-label">ขายรวม</div><div class="info-item-value" style="font-size:1.1rem;color:var(--navy);font-weight:700">${PCT.Utils.formatCurrency(req.salePrice || req.dealValue)}</div></div>
        <div><div class="info-item-label">ต้นทุนรวม</div><div class="info-item-value">${PCT.Utils.formatCurrency(req.costPrice)}</div></div>
      </div>
      ${req.type === 'hardware' ? `
        <div class="info-grid mb-4">
          <div><div class="info-item-label">ราคาขาย HW</div><div class="info-item-value">${PCT.Utils.formatCurrency(req.hardwareSalePrice || req.salePrice)}</div></div>
          <div><div class="info-item-label">ราคาต้นทุน HW</div><div class="info-item-value">${PCT.Utils.formatCurrency(req.hardwareCostPrice || req.costPrice)}</div></div>
        </div>` : `
        <div class="info-grid mb-4">
          <div><div class="info-item-label">ราคาขาย SW</div><div class="info-item-value">${PCT.Utils.formatCurrency(req.softwareSalePrice)}</div></div>
          <div><div class="info-item-label">ราคาต้นทุน SW</div><div class="info-item-value">${PCT.Utils.formatCurrency(req.softwareCostPrice)}</div></div>
          <div><div class="info-item-label">ราคาขาย Install.</div><div class="info-item-value">${PCT.Utils.formatCurrency(req.installationSalePrice)}</div></div>
          <div><div class="info-item-label">ราคาต้นทุน Install.</div><div class="info-item-value">${PCT.Utils.formatCurrency(req.installationCostPrice)}</div></div>
        </div>`}
      <div class="section-label">งวดชำระ</div>
      ${installmentRows ? `
        <div class="table-container" style="border-radius:var(--radius);overflow:hidden">
          <table class="data-table">
            <thead><tr><th>งวด</th><th>%</th><th>Credit</th><th>เพราะอะไร</th></tr></thead>
            <tbody>${installmentRows}</tbody>
          </table>
        </div>` : `<div class="info-item-value">${req.installmentCount || 1} งวด</div>`}` : '';

    /* ── Credit comparison ── */
    const compareCredit = (req.type === 'credit_term' || req.type === 'both') ? (() => {
      const current = req.currentCreditLimit || 0;
      const requested = req.creditAmount || 0;
      const pct = current > 0 ? ((requested - current) / current * 100).toFixed(1) : 0;
      const delta = requested - current;
      return `
        <div class="section-label">การเปลี่ยนแปลงวงเงินเครดิต</div>
        <div class="compare-box mb-4">
          <div class="compare-col">
            <div class="compare-label">วงเงินปัจจุบัน</div>
            <div class="compare-val">${PCT.Utils.formatCurrency(current)}</div>
            <div class="compare-sub">${req.currentCreditTermDays} วัน</div>
          </div>
          <div class="compare-arrow">${PCT.Icons.arrowRight}</div>
          <div class="compare-col highlight">
            <div class="compare-label">วงเงินที่ขอ</div>
            <div class="compare-val" style="color:var(--navy)">${PCT.Utils.formatCurrency(requested)}</div>
            <div class="compare-sub">${delta >= 0 ? '+' : ''}${PCT.Utils.formatCurrency(delta)} (${pct >= 0 ? '+' : ''}${pct}%) · ${req.creditTermDays} วัน</div>
          </div>
        </div>
        ${parseFloat(pct) > 50 ? `<div style="display:flex;align-items:flex-start;gap:10px;background:#FFFBEB;border:1px solid #FCD34D;border-radius:var(--radius);padding:12px 14px;margin-bottom:16px"><span style="color:#92400E;flex-shrink:0">${PCT.Icons.alertTriangle}</span><div style="font-size:.875rem;color:#92400E"><strong>วงเงินเพิ่มขึ้นเกิน 50%</strong> — คำขอนี้ต้องผ่านการอนุมัติจากผู้บริหารระดับสูง (L2)</div></div>` : ''}
        ${req.creditReason ? `<div class="form-group"><div class="info-item-label">เหตุผลการขอปรับวงเงิน</div><div style="font-size:.875rem;color:var(--body-text);line-height:1.7;margin-top:4px">${PCT.Utils.escapeHtml(req.creditReason)}</div></div>` : ''}`;
    })() : '';

    /* ── Payment comparison ── */
    const comparePayment = (req.type === 'payment_term' || req.type === 'both') ? (() => {
      const currentDays = req.currentPaymentTermDays || 0;
      const reqDays = req.paymentTermDays;
      const delta = reqDays != null ? reqDays - currentDays : null;
      const ptLabel = req.paymentTermOptionLabel || PCT.PAYMENT_TERM_LABELS?.[req.paymentTermOption] || (req.paymentTermDays != null ? `Net ${req.paymentTermDays}` : '—');
      const pmLabel = req.paymentMethodLabel || PCT.PAYMENT_METHOD_LABELS?.[req.paymentMethod] || req.paymentMethod || '';
      return `
        <div class="section-label">การเปลี่ยนแปลงเงื่อนไขชำระ</div>
        <div class="compare-box mb-4">
          <div class="compare-col">
            <div class="compare-label">เงื่อนไขปัจจุบัน</div>
            <div class="compare-val">Net ${currentDays}</div>
            <div class="compare-sub">${currentDays} วัน</div>
          </div>
          <div class="compare-arrow">${PCT.Icons.arrowRight}</div>
          <div class="compare-col highlight">
            <div class="compare-label">เงื่อนไขที่ขอ</div>
            <div class="compare-val" style="color:var(--navy)">${ptLabel}</div>
            <div class="compare-sub">${delta != null ? `${delta >= 0 ? '+' : ''}${delta} วัน · ` : ''}${pmLabel}</div>
          </div>
        </div>
        ${req.downPaymentPct ? `<div style="font-size:.85rem;color:var(--text-secondary);margin-bottom:8px">มัดจำ ${req.downPaymentPct}%${req.installmentCount ? ` · ${req.installmentCount} งวด` : ''}</div>` : ''}
        ${req.customTermText ? `<div class="form-group mb-4"><div class="info-item-label">เงื่อนไขกำหนดเอง</div><div style="font-size:.875rem;color:var(--body-text);margin-top:4px">${PCT.Utils.escapeHtml(req.customTermText)}</div></div>` : ''}
        ${req.paymentReason ? `<div class="form-group"><div class="info-item-label">เหตุผลการขอเงื่อนไขพิเศษ</div><div style="font-size:.875rem;color:var(--body-text);line-height:1.7;margin-top:4px">${PCT.Utils.escapeHtml(req.paymentReason)}</div></div>` : ''}`;
    })() : '';

    /* ── Timeline ── */
    const timelineItems = [];
    timelineItems.push({ cls:'created', icon:'plus', title:'สร้างคำขอ', meta:`โดย ${PCT.Utils.escapeHtml(req.requestedByName)} · ${PCT.Utils.formatDateTime(req.createdAt)}` });
    (req.approvals || []).forEach(a => {
      if (a.action) {
        timelineItems.push({
          cls: a.action === 'approve' ? 'approved' : 'rejected',
          icon: a.action === 'approve' ? 'check' : 'x',
          title: a.action === 'approve' ? `อนุมัติ (L${a.level})` : `ไม่อนุมัติ (L${a.level})`,
          meta: `โดย ${PCT.Utils.escapeHtml(a.approverName)} · ${PCT.Utils.formatDateTime(a.actionAt)}`,
          comment: a.comment
        });
      }
    });
    if (req.status === 'processed') {
      const procName = req.processedBy ? (PCT.Data.getUserById?.(req.processedBy)?.name || 'ฝ่ายบัญชี') : 'ฝ่ายบัญชี';
      timelineItems.push({ cls:'processed', icon:'checkCircle', title:'ดำเนินการแล้ว (บัญชี)', meta:`โดย ${procName} · ${PCT.Utils.formatDateTime(req.processedAt)}`, comment: req.accountingNote });
    }
    if (req.status === 'pending') {
      timelineItems.push({ cls:'pending', icon:'clock', title:'รอพิจารณา', meta:'รอการตัดสินใจจากผู้อนุมัติ' });
    }
    if (req.status === 'cancelled') {
      timelineItems.push({ cls:'rejected', icon:'x', title:'ยกเลิกคำขอ', meta:PCT.Utils.formatDateTime(req.updatedAt) });
    }

    const timeline = timelineItems.map((item, i) => `
      <div class="timeline-item">
        <div class="timeline-left">
          <div class="timeline-dot ${item.cls}">${PCT.Icons[item.icon] || ''}</div>
          ${i < timelineItems.length - 1 ? '<div class="timeline-line"></div>' : ''}
        </div>
        <div class="timeline-body">
          <div class="timeline-title">${item.title}</div>
          <div class="timeline-meta">${item.meta}</div>
          ${item.comment ? `<div class="timeline-comment">"${PCT.Utils.escapeHtml(item.comment)}"</div>` : ''}
        </div>
      </div>`).join('');

    /* ── Action buttons ── */
    const actionButtons = canApprove ? `
      <button class="btn btn-success w-full mb-2" id="btn-approve">${PCT.Icons.checkCircle} อนุมัติคำขอ</button>
      <button class="btn btn-danger w-full" id="btn-reject">${PCT.Icons.xCircle} ไม่อนุมัติ</button>` : '';
    const processButton = canProcess ? `
      <button class="btn btn-purple w-full" id="btn-process">${PCT.Icons.calculator} บันทึกการดำเนินการ</button>` : '';
    const cancelButton = canCancel ? `
      <button class="btn btn-ghost w-full mt-2" style="color:var(--error);border-color:rgba(243,85,79,0.25)" id="btn-cancel">${PCT.Icons.x} ยกเลิกคำขอ</button>` : '';

    return `
      ${PCT.UI.pageHeader({
        title: req.requestNo,
        subtitle: `${PCT.REQUEST_TYPE_LABELS[req.type] || req.type} · ${PCT.Utils.escapeHtml(req.customerName)}`,
        breadcrumb: [{label:'Dashboard',route:'dashboard'},{label:'คำขอ',route:'requests'},{label:req.requestNo,route:'request-detail'}],
        actions: `${PCT.Utils.statusBadge(req.status)}${req.riskAssessment ? ' ' + PCT.Utils.riskBadge(req.riskAssessment) : ''}`
      })}

      <div class="detail-grid">
        <!-- Left: main info -->
        <div>
          <!-- Deal info card -->
          ${req.dealTitle ? `
          <div class="card mb-4">
            <div class="card-header"><div class="card-title">${PCT.Icons.filePlus} ข้อมูลดีล</div></div>
            <div class="card-body">
              <div style="font-size:1.125rem;font-weight:700;color:var(--ink);margin-bottom:14px">${PCT.Utils.escapeHtml(req.dealTitle)}</div>
              <div class="info-grid">
                <div><div class="info-item-label">มูลค่าดีล</div><div class="info-item-value" style="font-size:1.1rem;color:var(--navy);font-weight:700">${PCT.Utils.formatCurrency(req.dealValue)}</div></div>
                ${req.proposalNo ? `<div><div class="info-item-label">เลข Proposal</div><div class="info-item-value td-mono">${PCT.Utils.escapeHtml(req.proposalNo)}</div></div>` : ''}
                ${req.dealCloseDate ? `<div><div class="info-item-label">วันที่คาดว่าจะปิดดีล</div><div class="info-item-value">${PCT.Utils.formatDate(req.dealCloseDate)}</div></div>` : ''}
                ${req.dealCategories?.length ? `<div><div class="info-item-label">หมวดหมู่</div><div class="info-item-value">${req.dealCategories.map(v => catLabels[v]||v).join(', ')}</div></div>` : ''}
                ${req.quotationRef ? `<div><div class="info-item-label">เลขที่ใบเสนอราคา</div><div class="info-item-value td-mono">${PCT.Utils.escapeHtml(req.quotationRef)}</div></div>` : ''}
                ${req.dealDesc ? `<div class="span-2"><div class="info-item-label">รายละเอียด</div><div class="info-item-value" style="white-space:pre-wrap;font-size:.875rem">${PCT.Utils.escapeHtml(req.dealDesc)}</div></div>` : ''}
              </div>
            </div>
          </div>` : ''}

          <!-- Terms comparison -->
          <div class="card mb-4">
            <div class="card-header"><div class="card-title">${PCT.Icons.creditCard} เงื่อนไขที่ขอ</div></div>
            <div class="card-body">
              ${simpleSaleTerms}${compareCredit}${comparePayment}
              ${!simpleSaleTerms && !compareCredit && !comparePayment ? '<div class="empty-desc">ไม่มีข้อมูลเงื่อนไข</div>' : ''}
            </div>
          </div>

          <!-- Request meta + justification -->
          <div class="card mb-4">
            <div class="card-header"><div class="card-title">${PCT.Icons.file} ข้อมูลคำขอ</div></div>
            <div class="card-body">
              <div class="info-grid mb-4">
                <div><div class="info-item-label">เลขที่คำขอ</div><div class="info-item-value td-mono">${PCT.Utils.escapeHtml(req.requestNo)}</div></div>
                <div><div class="info-item-label">ประเภท</div><div class="info-item-value">${PCT.REQUEST_TYPE_LABELS[req.type] || req.type}</div></div>
                <div><div class="info-item-label">ผู้ขอ</div><div class="info-item-value">${PCT.Utils.escapeHtml(req.requestedByName)}</div></div>
                <div><div class="info-item-label">วันที่สร้าง</div><div class="info-item-value">${PCT.Utils.formatDateTime(req.createdAt)}</div></div>
              </div>
              ${req.reason ? `<hr class="divider" />
              <div class="section-label">เหตุผลสำหรับผู้อนุมัติ</div>
              <p style="font-size:.875rem;color:var(--body-text);line-height:1.75;white-space:pre-wrap">${PCT.Utils.escapeHtml(req.reason || '')}</p>` : ''}
              ${req.notes ? `<p style="font-size:.8rem;color:var(--text-secondary);margin-top:10px;padding:10px 12px;background:var(--surface-2);border-radius:var(--radius);border:1px solid var(--border)">${PCT.Icons.info} ${PCT.Utils.escapeHtml(req.notes)}</p>` : ''}
            </div>
          </div>

          <!-- Customer info -->
          <div class="card">
            <div class="card-header"><div class="card-title">${PCT.Icons.building} ข้อมูลลูกค้า</div></div>
            <div class="card-body">
              ${(() => {
                const c = PCT.Data.getCustomerById(req.customerId);
                if (!c) return `
                  <div class="info-grid">
                    <div><div class="info-item-label">${req.customerMode === 'reseller' ? 'ลูกค้า / Reseller' : 'ชื่อลูกค้า'}</div><div class="info-item-value">${PCT.Utils.escapeHtml(req.customerName || req.resellerName || '—')}</div></div>
                    ${req.endCustomerName ? `<div><div class="info-item-label">ลูกค้าปลายทาง</div><div class="info-item-value">${PCT.Utils.escapeHtml(req.endCustomerName)}</div></div>` : ''}
                    ${req.customerContact ? `<div><div class="info-item-label">ผู้ติดต่อ</div><div class="info-item-value">${PCT.Utils.escapeHtml(req.customerContact)}</div></div>` : ''}
                  </div>`;
                return `
                  <div class="info-grid">
                    <div><div class="info-item-label">ชื่อลูกค้า</div><div class="info-item-value">${PCT.Utils.escapeHtml(c.name)}</div></div>
                    <div><div class="info-item-label">รหัสลูกค้า</div><div class="info-item-value td-mono">${PCT.Utils.escapeHtml(c.code)}</div></div>
                    ${req.endCustomerName ? `<div><div class="info-item-label">ลูกค้าปลายทาง</div><div class="info-item-value">${PCT.Utils.escapeHtml(req.endCustomerName)}</div></div>` : ''}
                    ${req.endCustomerContact ? `<div><div class="info-item-label">Contact</div><div class="info-item-value">${PCT.Utils.escapeHtml(req.endCustomerContact)}</div></div>` : ''}
                    ${req.endCustomerPhone ? `<div><div class="info-item-label">เบอร์โทร</div><div class="info-item-value">${PCT.Utils.escapeHtml(req.endCustomerPhone)}</div></div>` : ''}
                    <div><div class="info-item-label">วงเงินปัจจุบัน</div><div class="info-item-value">${PCT.Utils.formatCurrency(c.creditLimit)}</div></div>
                    <div><div class="info-item-label">เทอมเครดิต</div><div class="info-item-value">${c.creditTermDays} วัน</div></div>
                    <div><div class="info-item-label">ระดับความเสี่ยง</div><div class="info-item-value">${PCT.Utils.riskBadge(c.riskLevel)}</div></div>
                    ${c.industry ? `<div><div class="info-item-label">ประเภทธุรกิจ</div><div class="info-item-value">${PCT.Utils.escapeHtml(c.industry)}</div></div>` : ''}
                  </div>`;
              })()}
            </div>
          </div>
        </div>

        <!-- Right: actions + timeline -->
        <div>
          ${(actionButtons || processButton || cancelButton) ? `
          <div class="card mb-4">
            <div class="card-header"><div class="card-title">${PCT.Icons.check} การดำเนินการ</div></div>
            <div class="card-body">
              ${actionButtons}${processButton}${cancelButton}
            </div>
          </div>` : ''}

          <div class="card">
            <div class="card-header"><div class="card-title">${PCT.Icons.clock} ประวัติสถานะ</div></div>
            <div class="card-body">
              <div class="timeline">${timeline}</div>
            </div>
          </div>
        </div>
      </div>`;
  },

  init(params) {
    this._reqId = params && params.id;
    const user = PCT.Auth.getCurrentUser();
    const req  = PCT.Data.getRequestById(this._reqId);
    if (!req) return;

    if (document.getElementById('btn-approve')) {
      document.getElementById('btn-approve').onclick = () => this._showApprovalModal('approve', req);
      document.getElementById('btn-reject').onclick  = () => this._showApprovalModal('reject', req);
    }
    if (document.getElementById('btn-process')) {
      document.getElementById('btn-process').onclick = () => this._showProcessModal(req, user);
    }
    if (document.getElementById('btn-cancel')) {
      document.getElementById('btn-cancel').onclick = () => {
        PCT.UI.confirm({
          title: 'ยกเลิกคำขอ',
          msg: `ต้องการยกเลิกคำขอ <strong>${req.requestNo}</strong> ใช่หรือไม่? การดำเนินการนี้ไม่สามารถย้อนกลับได้`,
          confirmLabel: 'ยืนยันยกเลิก',
          danger: true,
          onConfirm: () => {
            req.status    = 'cancelled';
            req.updatedAt = new Date().toISOString();
            PCT.Data.saveRequest(req);
            PCT.UI.toast('ยกเลิกคำขอเรียบร้อยแล้ว', 'info', req.requestNo);
            PCT.Router.navigate('requests');
          }
        });
      };
    }
  },

  _showApprovalModal(action, req) {
    const isApprove = action === 'approve';
    PCT.UI.showModal({
      title: isApprove ? 'ยืนยันการอนุมัติ' : 'ยืนยันการไม่อนุมัติ',
      body: `
        <div style="background:var(--surface-2);border:1px solid var(--border);border-radius:var(--radius);padding:12px 14px;margin-bottom:16px;font-size:.875rem">
          <div style="font-weight:600;color:var(--ink)">${req.requestNo}</div>
          <div style="color:var(--text-secondary);margin-top:2px">${PCT.Utils.escapeHtml(req.customerName)} · ${PCT.REQUEST_TYPE_LABELS[req.type]||req.type}</div>
        </div>
        <div class="form-group">
          <label class="form-label">${isApprove ? 'หมายเหตุสำหรับผู้ขอ (ถ้ามี)' : 'เหตุผลที่ไม่อนุมัติ'} ${!isApprove ? '<span class="required">*</span>' : ''}</label>
          <textarea class="form-control" id="approval-comment" rows="4" placeholder="${isApprove ? 'ข้อความเพิ่มเติม เช่น เงื่อนไขที่อนุมัติได้...' : 'ระบุเหตุผลที่ชัดเจน เพื่อให้ Sales ปรับปรุงคำขอได้...'}"></textarea>
        </div>`,
      footer: `
        <button class="btn btn-secondary" onclick="PCT.UI.hideModal()">ยกเลิก</button>
        <button class="btn ${isApprove ? 'btn-success' : 'btn-danger'}" id="confirm-action-btn">
          ${isApprove ? PCT.Icons.checkCircle + ' ยืนยันอนุมัติ' : PCT.Icons.xCircle + ' ยืนยันไม่อนุมัติ'}
        </button>`
    });
    document.getElementById('confirm-action-btn').onclick = () => {
      const comment = document.getElementById('approval-comment').value.trim();
      if (!isApprove && !comment) { PCT.UI.toast('กรุณาระบุเหตุผลก่อนไม่อนุมัติ', 'warning'); return; }
      const user = PCT.Auth.getCurrentUser();
      req.status = isApprove ? 'approved' : 'rejected';
      req.updatedAt = new Date().toISOString();
      if (!req.approvals) req.approvals = [];
      const existing = req.approvals.find(a => !a.action);
      if (existing) {
        existing.approverId  = user.id;
        existing.approverName= user.name;
        existing.action      = action;
        existing.comment     = comment;
        existing.actionAt    = new Date().toISOString();
      } else {
        req.approvals.push({ level:1, approverId:user.id, approverName:user.name, action, comment, actionAt:new Date().toISOString() });
      }
      PCT.Data.saveRequest(req);
      PCT.UI.hideModal();
      PCT.UI.toast(isApprove ? 'อนุมัติคำขอเรียบร้อยแล้ว' : 'บันทึกการไม่อนุมัติแล้ว', isApprove ? 'success' : 'info', req.requestNo);
      PCT.Router.navigate('request-detail', { id: req.id });
    };
  },

  _showProcessModal(req, user) {
    PCT.UI.showModal({
      title: 'บันทึกการดำเนินการ (ฝ่ายบัญชี)',
      body: `
        <div style="background:var(--surface-2);border:1px solid var(--border);border-radius:var(--radius);padding:12px 14px;margin-bottom:16px;font-size:.875rem">
          <div style="font-weight:600;color:var(--ink)">${req.requestNo} · ${PCT.Utils.escapeHtml(req.customerName)}</div>
          ${req.dealTitle ? `<div style="color:var(--text-secondary);margin-top:2px">${PCT.Utils.escapeHtml(req.dealTitle)}</div>` : ''}
        </div>
        <div class="form-group">
          <label class="form-label">หมายเหตุการดำเนินการ</label>
          <textarea class="form-control" id="process-note" rows="3" placeholder="เช่น ปรับวงเงินในระบบ SAP เรียบร้อย, บันทึกเงื่อนไขใน contract..."></textarea>
        </div>`,
      footer: `
        <button class="btn btn-secondary" onclick="PCT.UI.hideModal()">ยกเลิก</button>
        <button class="btn btn-purple" id="confirm-process-btn">${PCT.Icons.checkCircle} ยืนยันดำเนินการ</button>`
    });
    document.getElementById('confirm-process-btn').onclick = () => {
      req.status          = 'processed';
      req.accountingStatus= 'processed';
      req.accountingNote  = document.getElementById('process-note').value.trim();
      req.processedBy     = user.id;
      req.processedAt     = new Date().toISOString();
      req.updatedAt       = new Date().toISOString();
      PCT.Data.saveRequest(req);
      PCT.UI.hideModal();
      PCT.UI.toast('บันทึกการดำเนินการเรียบร้อยแล้ว', 'success', req.requestNo);
      PCT.Router.navigate('request-detail', { id: req.id });
    };
  }
};
