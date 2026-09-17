const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));
app.use('/fotos', express.static('fotos'));

if (!fs.existsSync('./fotos')) {
    fs.mkdirSync('./fotos');
}

// --- ATUALIZAÇÃO AQUI: PADRÃO DE NOME "NOME-TURMA" ---
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './fotos/');
    },
    filename: function (req, file, cb) {
        // Captura o nome e a turma enviados pelo formulário
        const nomeRaw = req.body.nome || 'aluno';
        const turmaRaw = req.body.turma || 'sem_turma';

        // Limpa os textos removendo espaços extras, acentos e caracteres especiais
        // Transforma espaços em brancos em underscores (_) para manter o arquivo limpo no Windows
        const nomeLimpo = nomeRaw.toLowerCase().trim().replace(/[^a-z0-9]/g, '_');
        const turmaLimpa = turmaRaw.toLowerCase().trim().replace(/[^a-z0-9]/g, '_');
        
        // Pega a extensão original do arquivo (ex: .jpg ou .png)
        const extensao = path.extname(file.originalname);
        
        // Gera o nome final no padrão: nome_do_aluno-turma_do_aluno_timestamp.jpg
        cb(null, `${nomeLimpo}-${turmaLimpa}_${Date.now()}${extensao}`);
    }
});

const upload = multer({ storage: storage });

// Rota de Cadastro Modificada para aceitar registros sem foto
app.post('/cadastrar', upload.single('foto'), (req, res) => {
    try {
        const { nome, turma, telefone } = req.body;
        
        // Se houver arquivo, usa o nome gerado pelo Multer. Se não, define 'sem-foto.jpg'
        const fotoNome = req.file ? req.file.filename : 'sem-foto.jpg';
        
        const dataRegistro = new Date().toLocaleString('pt-BR');
        const linhaRegistro = `Data: ${dataRegistro} | Nome: ${nome} | Turma: ${turma} | Tel: ${telefone} | Foto: ${fotoNome}\n`;

        fs.appendFileSync('alunos.txt', linhaRegistro, 'utf8');

        res.json({ 
            sucesso: true, 
            mensagem: 'Aluno cadastrado com sucesso!',
            aluno: { nome, turma, telefone, foto: fotoNome }
        });
    } catch (error) {
        res.status(500).json({ sucesso: false, mensagem: 'Erro ao salvar os dados.' });
    }
});

// Rota para Listar Alunos
app.get('/alunos', (req, res) => {
    if (!fs.existsSync('alunos.txt')) return res.json([]);
    const conteudo = fs.readFileSync('alunos.txt', 'utf8');
    const linhas = conteudo.trim().split('\n');
    
    const alunos = linhas.map(linha => {
        if(!linha) return null;
        const nome = linha.match(/Nome: (.*?) \|/)?.[1];
        const turma = linha.match(/Turma: (.*?) \|/)?.[1];
        const telefone = linha.match(/Tel: (.*?) \|/)?.[1];
        const foto = linha.match(/Foto: (.*?)$/)?.[1];
        return { nome, turma, telefone, foto };
    }).filter(Boolean);

    res.json(alunos);
});

// Rota para Atualizar apenas a Foto do Aluno (Mantém o mesmo padrão)
app.post('/atualizar-foto', (req, res, next) => {
    // Essa rota precisa receber o nome do aluno antes do Multer rodar,
    // mas para manter o padrão nome-turma ao atualizar na página de consulta, 
    // buscamos a turma dele primeiro no banco TXT se necessário.
    next();
}, upload.single('novaFoto'), (req, res) => {
    try {
        const { nomeAluno } = req.body;
        const novaFotoNome = req.file ? req.file.filename : null;

        if (!novaFotoNome) {
            return res.status(400).json({ sucesso: false, mensagem: 'Nenhuma foto foi enviada.' });
        }

        if (!fs.existsSync('alunos.txt')) {
            return res.status(404).json({ sucesso: false, mensagem: 'Nenhum aluno cadastrado.' });
        }

        let conteudo = fs.readFileSync('alunos.txt', 'utf8');
        let linhas = conteudo.split('\n');
        let alunoEncontrado = false;

        linhas = linhas.map(linha => {
            if (linha.includes(`Nome: ${nomeAluno} |`)) {
                alunoEncontrado = true;
                return linha.replace(/Foto: .*?$/, `Foto: ${novaFotoNome}`);
            }
            return line = linha;
        });

        if (!alunoEncontrado) {
            return res.status(404).json({ sucesso: false, mensagem: 'Aluno não encontrado.' });
        }

        fs.writeFileSync('alunos.txt', linhas.join('\n'), 'utf8');

        res.json({ 
            sucesso: true, 
            mensagem: 'Foto atualizada com sucesso!', 
            novaFoto: novaFotoNome 
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ sucesso: false, mensagem: 'Erro interno ao atualizar.' });
    }
});

app.listen(PORT, () => {
    console.log(`Servidor da portaria rodando em http://localhost:${PORT}`);
});