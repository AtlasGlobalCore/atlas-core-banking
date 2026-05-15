const fs = require('fs');
const path = require('path');

const serverPath = path.join(__dirname, 'src/server.ts');
let content = fs.readFileSync(serverPath, 'utf8');

if (!content.includes('auth.routes')) {
    // 1. Injetar o Import
    content = content.replace(
        "import dashboardRoutes from './routes/dashboard.routes';",
        "import dashboardRoutes from './routes/dashboard.routes';\nimport authRoutes from './routes/auth.routes';"
    );
    
    // 2. Injetar a Rota
    content = content.replace(
        "app.use('/api/v1/checkout', checkoutRoutes);",
        "app.use('/api/v1/auth', authRoutes);\napp.use('/api/v1/checkout', checkoutRoutes);"
    );
    
    fs.writeFileSync(serverPath, content);
    console.log('✅ Rota de Autenticação INJETADA com sucesso no server.ts!');
} else {
    console.log('⚠️ A rota já lá estava. O problema é outro.');
}
