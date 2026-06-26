function initReportViews(db) {
    content.querySelectorAll('[data-report-view]').forEach(view => {
        if (view.dataset.ready === 'true') {
            return;
        }

        view.dataset.ready = 'true';
        const report = db.reports?.[view.dataset.reportId];

        if (!report) {
            view.innerHTML = '<div class="p-6 text-red-700">Report definition was not found.</div>';
            return;
        }

        const columns = report.columns || [];
        const rows = report.rows || [];
        const colors = ['#5b9bd5', '#ed7d31', '#70ad47', '#ffc000', '#9e67ab'];

        view.innerHTML = `
            <div class="mx-auto min-h-[720px] w-[760px] bg-white p-10 shadow-xl">
                <div class="border-b-4 border-[#a92f35] pb-4">
                    <h2 class="text-3xl font-semibold text-[#a92f35]">${escapeHtml(report.title || 'Report')}</h2>
                    <p class="text-neutral-500">${escapeHtml(report.period || '')}</p>
                </div>
                <div class="mt-8 grid grid-cols-3 gap-4 text-center">
                    ${(report.stats || []).map(stat => `
                        <div class="report-stat">
                            <span>${escapeHtml(stat.label)}</span>
                            <strong>${escapeHtml(stat.value)}</strong>
                        </div>
                    `).join('')}
                </div>
                <table class="mt-8 w-full border-collapse text-sm">
                    <thead>
                        <tr class="bg-[#eceff3]">
                            ${columns.map(column => `<th class="report-th">${escapeHtml(column)}</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        ${rows.map(row => `
                            <tr>
                                ${columns.map(column => `<td class="report-td">${escapeHtml(row[column] ?? '')}</td>`).join('')}
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                <div class="mt-12 h-40 border border-dashed border-[#9aa6b2] bg-[#f8fafc] p-4">
                    <div class="mb-3 text-sm font-semibold text-neutral-600">Sales by category</div>
                    <div class="flex h-24 items-end gap-4">
                        ${(report.chart || []).map((height, index) => `
                            <div class="w-20" style="height:${Number(height) || 0}%; background:${colors[index % colors.length]}"></div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    });
}

