new Vue({
    el: '#app',
    data: {
        scannerAtivo: false,
        codigoLido: null,
        produto: null,
        carregando: false,
        erro: null,
        quaggaInicializado: false
    },
    methods: {
        async iniciarScanner() {
            try {
                this.scannerAtivo = true;
                this.codigoLido = null;
                this.produto = null;
                this.erro = null;
                
                // Verificar se há permissão de câmera
                if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                    this.erro = 'Câmera não suportada neste dispositivo';
                    this.scannerAtivo = false;
                    return;
                }

                // Configuração otimizada para mobile
                const config = {
                    inputStream: {
                        name: "Live",
                        type: "LiveStream",
                        target: document.querySelector('#interactive'),
                        constraints: {
                            width: { min: 640, ideal: 1280, max: 1920 },
                            height: { min: 480, ideal: 720, max: 1080 },
                            aspectRatio: { ideal: 1.333 },
                            facingMode: "environment"
                        },
                        area: {
                            top: "0%",
                            right: "0%",
                            left: "0%",
                            bottom: "0%"
                        }
                    },
                    locator: {
                        patchSize: "medium",
                        halfSample: true
                    },
                    numOfWorkers: navigator.hardwareConcurrency || 4,
                    decoder: {
                        readers: [
                            "ean_reader",
                            "ean_8_reader",
                            "code_128_reader",
                            "upc_reader",
                            "upc_e_reader"
                        ]
                    },
                    locate: true,
                    frequency: 10
                };

                // Inicializar QuaggaJS
                await new Promise((resolve, reject) => {
                    Quagga.init(config, (err) => {
                        if (err) {
                            reject(err);
                            return;
                        }
                        this.quaggaInicializado = true;
                        resolve();
                    });
                });

                Quagga.start();

                // Detectar código de barras
                Quagga.onDetected((data) => {
                    if (data.codeResult && data.codeResult.code) {
                        const codigo = data.codeResult.code;
                        console.log('Código detectado:', codigo);
                        this.codigoLido = codigo;
                        this.buscarProduto(codigo);
                        this.pararScanner();
                    }
                });

                // Timeout para evitar travamentos
                setTimeout(() => {
                    if (this.scannerAtivo && !this.codigoLido) {
                        this.erro = 'Nenhum código detectado. Tente novamente.';
                        this.pararScanner();
                    }
                }, 30000);

            } catch (error) {
                console.error('Erro ao inicializar scanner:', error);
                this.erro = 'Erro ao acessar a câmera: ' + error.message;
                this.scannerAtivo = false;
            }
        },
        
        pararScanner() {
            if (this.quaggaInicializado) {
                Quagga.stop();
                this.quaggaInicializado = false;
            }
            this.scannerAtivo = false;
        },

        async buscarProduto(codigo) {
            this.carregando = true;
            this.produto = null;
            this.erro = null;
            
            try {
                // Limpar código (remover caracteres não numéricos)
                codigo = codigo.toString().replace(/[^\d]/g, '');
                
                // Carrega o arquivo JSON local
                const response = await fetch('produtos.json');
                const produtos = await response.json();
                
                // Busca o produto no JSON - CORREÇÃO AQUI
                const produtoEncontrado = produtos.find(
                    produto => produto.codigo_barras === codigo
                );
                
                if (produtoEncontrado) {
                    this.produto = produtoEncontrado;
                } else {
                    // Tenta API externa se não encontrar localmente
                    await this.buscarNaAPIExterna(codigo);
                }
            } catch (error) {
                console.error('Erro ao buscar produto:', error);
                this.erro = 'Erro ao buscar produto: ' + error.message;
            } finally {
                this.carregando = false;
            }
        },

        async buscarNaAPIExterna(codigo) {
            try {
                const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${codigo}.json`);
                const data = await response.json();
                
                if (data.status === 1) {
                    const product = data.product;
                    this.produto = {
                        codigo_barras: codigo,
                        nome: product.product_name || 'Produto não identificado',
                        marca: product.brands || 'Marca não informada',
                        categoria: product.categories || 'Categoria não informada',
                        preco: 'Consultar',
                        imagem: product.image_url || '',
                        fonte: 'open_food_facts'
                    };
                } else {
                    this.erro = 'Produto não encontrado na base local nem externa';
                }
            } catch (error) {
                console.error('Erro na API externa:', error);
                this.erro = 'Produto não encontrado e erro ao consultar API externa';
            }
        },

        // Método alternativo para digitar código manualmente
        digitarCodigoManual() {
            const codigo = prompt('Digite o código de barras:');
            if (codigo && codigo.trim() !== '') {
                this.codigoLido = codigo.trim();
                this.buscarProduto(this.codigoLido);
            }
        }
    },
    
    beforeDestroy() {
        this.pararScanner();
    }
});