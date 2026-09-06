declare class Logger {
    private log;
    info(message: string, ...args: any[]): void;
    warn(message: string, ...args: any[]): void;
    error(message: string, ...args: any[]): void;
    debug(message: string, ...args: any[]): void;
}
export declare const logger: Logger;
export default logger;
//# sourceMappingURL=logger.d.ts.map