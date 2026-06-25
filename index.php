<?php
$initialView = $_GET['view'] ?? 'table-customers';
?>
<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Access Web Mockup</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="vendor/fontawesome/css/all.min.css">
    <link rel="stylesheet" href="assets/app.css">
</head>
<body class="h-screen overflow-hidden bg-[#0078d7] text-[13px] text-neutral-900">
    <div id="access-app" class="mx-auto flex h-screen max-w-[1440px] flex-col border border-[#6f1f25] bg-white shadow-2xl" data-initial-view="<?= htmlspecialchars($initialView, ENT_QUOTES) ?>">
        <header class="select-none">
            <div class="flex h-8 items-center bg-[#a92f35] text-white">
                <div class="flex h-full w-[168px] items-center gap-2 px-3">
                    <button class="quick-btn" title="Save"><i class="fas fa-save"></i></button>
                    <button class="quick-btn opacity-50" title="Undo"><i class="fas fa-undo"></i></button>
                    <button class="quick-btn opacity-50" title="Redo"><i class="fas fa-redo"></i></button>
                    <button class="quick-btn" title="Customize"><i class="fas fa-caret-down"></i></button>
                </div>
                <div class="flex h-full items-center border-x border-white/10 px-7 text-[11px]">Table Tools</div>
                <div class="flex-1 truncate text-center text-xs">Database1 : Database - C:\Users\Demo\Desktop\Database1.accdb (Access Web)</div>
                <div class="flex h-full items-center gap-5 px-4">
                    <span class="text-xs">Lisa Washington</span>
                    <button class="win-btn" title="Minimize"><i class="fas fa-minus"></i></button>
                    <button class="win-btn" title="Maximize"><i class="far fa-square"></i></button>
                    <button class="win-btn" title="Close"><i class="fas fa-times"></i></button>
                </div>
            </div>

            <div class="flex h-11 items-end bg-[#a92f35] text-white">
                <nav class="flex h-full items-end">
                    <button class="ribbon-tab px-5" data-ribbon="file">File</button>
                    <button class="ribbon-tab active px-5" data-ribbon="home">Home</button>
                    <button class="ribbon-tab px-5" data-ribbon="create">Create</button>
                    <button class="ribbon-tab px-5" data-ribbon="external">External Data</button>
                    <button class="ribbon-tab px-5" data-ribbon="database">Database Tools</button>
                    <button class="ribbon-tab px-5" data-ribbon="fields">Fields</button>
                    <button class="ribbon-tab px-5" data-ribbon="table">Table</button>
                </nav>
                <div class="mb-3 ml-3 flex min-w-[260px] items-center gap-2 text-white/95">
                    <span class="text-lg leading-none">?</span>
                    <span>Tell me what you want to do</span>
                </div>
                <div class="ml-auto mb-3 mr-5 text-lg">:)</div>
            </div>

            <section id="ribbon" class="h-[92px] border-b border-[#c8c8c8] bg-[#f4f4f4]"></section>
        </header>

        <main id="workspace-main" class="grid min-h-0 flex-1 grid-cols-[238px_minmax(0,1fr)] bg-white">
            <aside id="object-pane" class="flex min-h-0 flex-col border-r border-[#aeb7c1] bg-[#f8f8f8]">
                <div class="flex h-9 items-center border-b border-[#d0d0d0] px-2">
                    <h1 class="truncate text-[22px] text-[#9b3035]">All Access Objects</h1>
                    <button id="object-pane-toggle" class="object-pane-toggle ml-auto" type="button" aria-label="Collapse object pane" aria-expanded="true"><i class="fas fa-angle-double-left"></i></button>
                </div>
                <div class="border-b border-[#d0d0d0] p-2">
                    <label class="flex h-7 items-center border border-[#aab7c4] bg-white">
                        <input class="h-full flex-1 px-2 italic outline-none" value="Search..." aria-label="Search">
                        <span class="grid h-full w-7 place-items-center border-l border-[#aab7c4] text-[#2070b8]"><i class="fas fa-search"></i></span>
                    </label>
                </div>
                <nav class="min-h-0 flex-1 overflow-auto p-2" id="object-list">
                    <div class="object-section">
                        <div class="object-heading"><span>Tables</span><button class="object-toggle" type="button" aria-label="Collapse Tables" aria-expanded="true"><i class="fas fa-chevron-up"></i></button></div>
                        <button class="object-link active" data-view="table-customers"><i class="fas fa-table table-icon"></i>Customers</button>
                        <button class="object-link" data-view="table-orders"><i class="fas fa-table table-icon"></i>Orders</button>
                        <button class="object-link" data-view="table-order-items"><i class="fas fa-table table-icon"></i>OrderItems</button>
                        <button class="object-link" data-view="table-products"><i class="fas fa-table table-icon"></i>Products</button>
                        <button class="object-link" data-view="table-regions"><i class="fas fa-table table-icon"></i>Regions</button>
                        <button class="object-link" data-view="table-sales-targets"><i class="fas fa-table table-icon"></i>SalesTargets</button>
                    </div>
                    <div class="object-section">
                        <div class="object-heading"><span>Forms</span><button class="object-toggle" type="button" aria-label="Collapse Forms" aria-expanded="true"><i class="fas fa-chevron-up"></i></button></div>
                        <button class="object-link" data-view="form-customer-orders"><i class="fas fa-window-restore form-icon"></i>CustomerOrders</button>
                        <button class="object-link" data-view="form-invoice-entry"><i class="fas fa-window-restore form-icon"></i>InvoiceEntry</button>
                    </div>
                    <div class="object-section">
                        <div class="object-heading"><span>Queries</span><button class="object-toggle" type="button" aria-label="Collapse Queries" aria-expanded="true"><i class="fas fa-chevron-up"></i></button></div>
                        <button class="object-link" data-view="query-open-orders"><i class="fas fa-project-diagram query-icon"></i>OpenOrders</button>
                        <button class="object-link" data-view="query-sales-region"><i class="fas fa-project-diagram query-icon"></i>SalesByRegion</button>
                    </div>
                    <div class="object-section">
                        <div class="object-heading"><span>Reports</span><button class="object-toggle" type="button" aria-label="Collapse Reports" aria-expanded="true"><i class="fas fa-chevron-up"></i></button></div>
                        <button class="object-link" data-view="report"><i class="fas fa-file-alt report-icon"></i>InvoiceSummary</button>
                    </div>
                </nav>
            </aside>

            <section class="flex min-w-0 flex-col">
                <div class="flex h-7 items-end border-b border-[#aeb7c1] bg-[#f5f7f9] pl-2" id="document-tabs"></div>
                <div id="content" class="min-h-0 flex-1 overflow-auto bg-white"></div>
            </section>
        </main>

        <footer class="flex h-6 items-center border-t border-[#b8b8b8] bg-[#efefef] px-2 text-xs">
            <span id="view-status">Datasheet View</span>
            <div class="ml-auto flex items-center gap-7">
                <span>Num Lock</span>
                <i class="fas fa-table status-icon" title="Datasheet"></i>
                <i class="fas fa-pencil-ruler status-icon" title="Design"></i>
            </div>
        </footer>
    </div>
    <script src="assets/app.js"></script>
</body>
</html>
