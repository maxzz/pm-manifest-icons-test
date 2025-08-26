export function createLogger(verbose: boolean) {
    return {
        info: (msg: string, obj?: any) => console.log(format('info', msg, obj)),
        debug: (msg: string, obj?: any) => {
            if (verbose) console.log(format('debug', msg, obj));
        },
        warn: (msg: string, obj?: any) => console.warn(format('warn', msg, obj)),
        error: (msg: string, obj?: any) => console.error(format('error', msg, obj)),
    };
}

function format(level: 'info' | 'debug' | 'warn' | 'error', msg: string, obj?: any) {
    const out: any = { ts: new Date().toISOString(), level, msg };
    if (obj) out.data = obj;
    return JSON.stringify(out);
}
