export default { output: 'export', experimental: { cpus: 2 }, distDir: process.env.NODE_ENV === 'development' ? '.next-dev' : '.next', images: { unoptimized: true } };
