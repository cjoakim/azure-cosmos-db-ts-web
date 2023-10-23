/**
 * Class CodeSamples contains small code snippets that can be displayed in the UI.
 * This functionality is exploratory, not yet integrated into this app.
 * Chris Joakim, Microsoft, 2023
 */

// Add this view fragment to the view
// <%- include('_code_sample'); %>

export class CodeSamples {

    constructor() { }

    static cosmosDbNoSqlPatch(): string {
        return `

`.trim();
    }

    static cosmosDbNoSqlBulkLoad(): string {
        return `
See azu-js CosmosNoSqlUti.ts

/**
 * Execute a bulk-load or bulk-upsert of the given documents into the
 * given database and container.  These operations are executed in
 * batches of up to 50 documents per batch, per the given batchSize.
 * An instance of class BulkLoadResult is returned - it contains the
 * aggregated/summarized resuls of the bulk operation.  This includes
 * document counts, elapsed time, RU consumption, and response codes
 * counts.
 */
async loadContainerBulkAsync(
    dbName: string,
    cName:  string,
    operationName: string,
    documents: Array<object>,
    generateIds: boolean = false,
    givenBatchSize: number = 50,
    bulkOptions?: BulkOptions,
    reqOptions?: RequestOptions): Promise<BulkLoadResult> {

    this.setCurrentDatabaseAsync(dbName);
    this.setCurrentContainerAsync(cName);
    let jsonObjects : JSONObject[] = this.buildJsonObjectArray(documents, generateIds);
    let batchSize = this.normalizedBatchSize(givenBatchSize);

    let operationType : any = BulkOperationType.Create; // default to Create unless explicitly Upsert
    if (operationName.toLocaleLowerCase().trim() === 'upsert') {
        operationType = BulkOperationType.Upsert;
    }
    let bulkLoadResult : BulkLoadResult = new BulkLoadResult();  // this is the method return object
    bulkLoadResult.inputDocumentCount = documents.length;
    bulkLoadResult.batchSize = batchSize;
    bulkLoadResult.start()

    let operations = new Array<OperationInput>();

    for (let i = 0; i < jsonObjects.length; i++) {
        let resourceBody = jsonObjects[i];
        let op: OperationInput = {
            operationType,
            resourceBody
        };
        operations.push(op);
        // execute a batch of batchSize operations while iterating through
        // the input document array.
        if (operations.length >= batchSize) {
            await this.executeBulkBatch(operations, bulkLoadResult, bulkOptions, reqOptions);
            //operations = new Array<OperationInput>();
            operations.length = 0
        }
    }
    // execute the last batch if necessary
    if (operations.length > 0) {
        await this.executeBulkBatch(operations, bulkLoadResult, bulkOptions, reqOptions);
    }
    bulkLoadResult.finish();
    return bulkLoadResult;
}

private async executeBulkBatch(
    operations : Array<OperationInput>,
    blr : BulkLoadResult,
    bulkOptions?: BulkOptions,
    reqOptions?: RequestOptions) : Promise<boolean> {

    let bulkOpResp : BulkOperationResponse =
        await this.currentContainer.items.bulk(operations, bulkOptions, reqOptions);
    blr.increment(bulkOpResp);
    return true;
}
`.trim()
    }
}
