<template id="template-expression-builder">
    <dialog class="expression-builder-dialog">
        <form method="dialog" class="expression-builder-window" data-expression-builder-form>
            <div class="expression-builder-title">
                <span>Expression Builder</span>
                <button type="button" data-expression-cancel aria-label="Close"><i class="fas fa-times"></i></button>
            </div>
            <div class="expression-builder-body">
                <div class="expression-builder-main">
                    <p>Enter an Expression to <a href="#" data-expression-help>validate</a> the data in this field:</p>
                    <p>(Examples of expressions include [field1] + [field2] and [field1] &lt; 5)</p>
                    <textarea data-expression-input spellcheck="false"></textarea>
                    <div class="expression-builder-preview" data-expression-preview>
                        <div><strong>JavaScript:</strong> <code data-expression-js></code></div>
                        <div><strong>Result:</strong> <span data-expression-result></span></div>
                    </div>
                    <div class="expression-javascript-editor" data-expression-js-editor hidden>
                        <label>
                            JavaScript function
                            <textarea data-expression-js-input spellcheck="false"></textarea>
                        </label>
                    </div>
                </div>
                <div class="expression-builder-actions">
                    <button class="primary" type="submit">OK</button>
                    <button type="button" data-expression-cancel>Cancel</button>
                    <button type="button" data-expression-help-button>Help</button>
                    <button type="button" data-expression-toggle-js>JavaScript</button>
                    <button type="button" data-expression-less>&lt;&lt; Less</button>
                </div>
                <p class="expression-builder-error" data-expression-error hidden></p>
                <div class="expression-browser" data-expression-browser>
                    <section>
                        <h3>Expression Elements</h3>
                        <div class="expression-list expression-tree" data-expression-elements></div>
                    </section>
                    <section>
                        <h3>Expression Categories</h3>
                        <div class="expression-list" data-expression-categories></div>
                    </section>
                    <section>
                        <h3>Expression Values</h3>
                        <div class="expression-list" data-expression-values></div>
                    </section>
                </div>
                <div class="expression-builder-description" data-expression-description></div>
            </div>
        </form>
    </dialog>
</template>
