<div class="view-shell bg-[#bfc8d2]" data-title="InvoiceSummary" data-status="Report View">
    <div class="mx-auto min-h-[720px] w-[760px] bg-white p-10 shadow-xl">
        <div class="border-b-4 border-[#a92f35] pb-4">
            <h2 class="text-3xl font-semibold text-[#a92f35]">Invoice Summary</h2>
            <p class="text-neutral-500">For period ending June 24, 2026</p>
        </div>
        <div class="mt-8 grid grid-cols-3 gap-4 text-center">
            <div class="report-stat"><span>Total Sales</span><strong>$48,230</strong></div>
            <div class="report-stat"><span>Open Orders</span><strong>18</strong></div>
            <div class="report-stat"><span>New Customers</span><strong>7</strong></div>
        </div>
        <table class="mt-8 w-full border-collapse text-sm">
            <thead><tr class="bg-[#eceff3]"><th class="report-th">Customer</th><th class="report-th">Orders</th><th class="report-th">Balance</th><th class="report-th">Status</th></tr></thead>
            <tbody>
                <tr><td class="report-td">Contoso Books</td><td class="report-td">3</td><td class="report-td">$2,481.00</td><td class="report-td">Open</td></tr>
                <tr><td class="report-td">Northwind</td><td class="report-td">2</td><td class="report-td">$1,180.00</td><td class="report-td">Open</td></tr>
                <tr><td class="report-td">Alpine Ski</td><td class="report-td">6</td><td class="report-td">$8,942.00</td><td class="report-td">Paid</td></tr>
                <tr><td class="report-td">Blue Yonder</td><td class="report-td">1</td><td class="report-td">$490.00</td><td class="report-td">Open</td></tr>
            </tbody>
        </table>
        <div class="mt-12 h-40 border border-dashed border-[#9aa6b2] bg-[#f8fafc] p-4">
            <div class="mb-3 text-sm font-semibold text-neutral-600">Sales by category</div>
            <div class="flex h-24 items-end gap-4">
                <div class="w-20 bg-[#5b9bd5]" style="height: 60%"></div>
                <div class="w-20 bg-[#ed7d31]" style="height: 78%"></div>
                <div class="w-20 bg-[#70ad47]" style="height: 46%"></div>
                <div class="w-20 bg-[#ffc000]" style="height: 88%"></div>
            </div>
        </div>
    </div>
</div>
