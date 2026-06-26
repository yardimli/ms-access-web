<div id="view-templates" hidden>
    <template id="template-table-datasheet">
        <div class="view-shell" data-title="" data-status="Datasheet View">
            <div class="datasheet-view" data-table-view data-table-id="">
                <div class="datasheet-wrap" data-table-host></div>
                <div class="record-bar" data-record-bar>
                    <span>Record:</span>
                    <button data-nav="first" title="First record"><i class="fas fa-step-backward"></i></button>
                    <button data-nav="previous" title="Previous record"><i class="fas fa-caret-left"></i></button>
                    <input class="record-position-input" data-record-position value="1 of 1">
                    <button data-nav="next" title="Next record"><i class="fas fa-caret-right"></i></button>
                    <button data-nav="last" title="Last record"><i class="fas fa-step-forward"></i></button>
                    <button class="opacity-40" disabled title="New record"><i class="fas fa-asterisk"></i></button>
                    <span class="border-l border-[#c6c6c6] pl-2 text-neutral-500">No Filter</span>
                    <input class="record-search-input" value="Search">
                </div>
            </div>
        </div>
    </template>

    <template id="template-table-design">
        <div class="view-shell" data-title="" data-status="Table Design View">
            <div class="design-view" data-design-view data-table-id="">
                <div class="p-6 text-neutral-500">Loading table structure...</div>
            </div>
        </div>
    </template>

    <template id="template-form-view">
        <div class="view-shell bg-[#d9e4f0]" data-title="" data-status="Form View">
            <div class="form-view" data-form-view data-form-id="">
                <div class="p-6 text-neutral-500">Loading form data...</div>
            </div>
        </div>
    </template>

    <template id="template-form-design">
        <div class="view-shell" data-title="" data-status="Form Design View">
            <div class="form-design-view" data-form-design-view data-form-id="">
                <div class="p-6 text-neutral-500">Loading form designer...</div>
            </div>
        </div>
    </template>

    <template id="template-query-builder">
        <div class="view-shell" data-title="" data-status="Query Graph View">
            <div class="query-builder" data-query-builder data-query-id="">
                <div class="query-toolbar">
                    <select class="query-table-picker" data-table-picker></select>
                    <button class="query-tool active" data-add-selected-table>Add Table</button>
                    <button class="query-tool" data-clear-connections>Clear Links</button>
                    <span class="query-hint">Drag nodes. Click one column, then another column on a different table to create a link. Select a link and press Delete to remove it.</span>
                </div>
                <div class="query-canvas" data-query-canvas tabindex="0">
                    <svg class="query-wires" data-query-wires aria-hidden="true"></svg>
                </div>
                <div class="query-bottom">
                    <div data-query-grid></div>
                </div>
            </div>
        </div>
    </template>

    <template id="template-report-view">
        <div class="view-shell bg-[#bfc8d2]" data-title="" data-status="Report View">
            <div data-report-view data-report-id="">
                <div class="p-6 text-neutral-600">Loading report...</div>
            </div>
        </div>
    </template>
</div>
