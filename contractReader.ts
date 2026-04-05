import { watchContractEvent } from "viem/actions";
import { createPublicClient, ParseAbiItem, http, parseAbiItem } from "viem";
import { StateManager } from "./stateManager";
import { mainnet } from "viem/chains";

export class ContractReader {
    private client;
    private lastBlockProcessed: bigint;

    constructor(private stateManager: StateManager, private db: any) {
        this.client = createPublicClient({
            chain: mainnet,
            transport: http()
        });
        this.lastBlockProcessed = 0n; // If the server ever goes down. This is used as reference for how many blocks we have to read in order for our system to resync.
    }

    async start() {
        this.lastBlockProcessed = await this.db.getLatestBlock() // Where we left off in the event server was down
        await this.syncHistoricalEvents();
        this.listenRealTime();
    }

    private async syncHistoricalEvents() {
        const currentBlock = await this.client.getBlockNumber();

        const CHUNK_SIZE = 1000n;  // to avoid RPC timeouts, data size (events) will be too big

        for (let nextBlock = this.lastBlockProcessed + 1n; nextBlock <= currentBlock; nextBlock += CHUNK_SIZE ) {
            const to = nextBlock + CHUNK_SIZE > currentBlock ? currentBlock : nextBlock + CHUNK_SIZE

            const logs = await this.client.getLogs({
                address: CONTRACT_ADDRESSS,
                event: parseAbiItem("..."),
                fromBlock: nextBlock,
                toBlock: to
            });
            await this.handleLogs(logs)
            await this.db.saveLastBlock(to);
        }
    }
}
