"""
=============================================================================
TRANSFORMER EXPLAINER & MINI-GPT EM PYTORCH
Disciplina: Redes Recorrentes & Processamento de Linguagem Natural (Mestrado)
=============================================================================
Este script tem duas finalidades:
1. Servidor Local Web: Inicia um servidor HTTP local para abrir o site interativo
   `index.html` (inspirado no Transformer Explainer).
   Execução: python transformers.py --serve (ou simplesmente python transformers.py)

2. Demonstração Didática em PyTorch: Implementação limpa e comentada de um
   Decoder-only Transformer (estilo GPT-2) com Scaled Dot-Product Attention,
   Máscara Causal, LayerNorm, FFN e Geração Autoregressiva com Temperatura e Top-K.
   Execução: python transformers.py --demo
=============================================================================
"""

import sys
import os
import argparse
import webbrowser
import math
from http.server import HTTPServer, SimpleHTTPRequestHandler

# Força UTF-8 no stdout para compatibilidade no terminal Windows
if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

# Tentativa de importação do PyTorch para a demonstração prática
try:
    import torch
    import torch.nn as nn
    import torch.nn.functional as F
    TORCH_AVAILABLE = True
except (ImportError, OSError):
    TORCH_AVAILABLE = False


# =============================================================================
# 1. IMPLEMENTAÇÃO DIDÁTICA DO TRANSFORMER DECODER EM PYTORCH
# =============================================================================

if TORCH_AVAILABLE:

    class CausalSelfAttention(nn.Module):
        """
        Mecanismo de Auto-Atenção Causal com Múltiplas Cabeças (Multi-Head Causal Self-Attention).
        
        Equação Fundamental:
        Attention(Q, K, V) = Softmax( (Q * K^T) / sqrt(d_k) + M_causal ) * V
        """
        def __init__(self, d_model: int = 64, n_heads: int = 4, max_seq_len: int = 128):
            super().__init__()
            assert d_model % n_heads == 0, "d_model deve ser divisível por n_heads"
            
            self.d_model = d_model
            self.n_heads = n_heads
            self.d_k = d_model // n_heads

            # Projeções lineares para Query, Key e Value em uma única matriz combinada
            self.qkv_proj = nn.Linear(d_model, 3 * d_model)
            # Projeção linear de saída
            self.out_proj = nn.Linear(d_model, d_model)

            # Máscara Causal (Look-Ahead Mask): matriz triangular inferior
            # Registrada como buffer persistente (não é parâmetro treinável)
            mask = torch.tril(torch.ones(max_seq_len, max_seq_len)).view(1, 1, max_seq_len, max_seq_len)
            self.register_buffer("causal_mask", mask)

        def forward(self, x: torch.Tensor, return_attention_weights: bool = False):
            B, T, C = x.shape  # Batch, Comprimento da Sequência (Time/Tokens), Canais (d_model)

            # 1. Calcular Q, K, V simultaneamente
            qkv = self.qkv_proj(x)  # [B, T, 3 * d_model]
            q, k, v = qkv.chunk(3, dim=-1)  # Cada um tem formato [B, T, d_model]

            # 2. Dividir em múltiplas cabeças e transpor para [B, n_heads, T, d_k]
            q = q.view(B, T, self.n_heads, self.d_k).transpose(1, 2)
            k = k.view(B, T, self.n_heads, self.d_k).transpose(1, 2)
            v = v.view(B, T, self.n_heads, self.d_k).transpose(1, 2)

            # 3. Scaled Dot-Product: (Q * K^T) / sqrt(d_k)
            scores = torch.matmul(q, k.transpose(-2, -1)) / math.sqrt(self.d_k)  # [B, n_heads, T, T]

            # 4. Aplicação da Máscara Causal: onde a máscara for 0, preenche com -infinito
            scores = scores.masked_fill(self.causal_mask[:, :, :T, :T] == 0, float('-inf'))

            # 5. Softmax para obter os pesos de probabilidade de atenção
            attention_weights = F.softmax(scores, dim=-1)

            # 6. Ponderação dos Values: Attention_Weights * V
            context = torch.matmul(attention_weights, v)  # [B, n_heads, T, d_k]

            # 7. Reconcatenar as cabeças de volta para a dimensão cheia d_model
            context = context.transpose(1, 2).contiguous().view(B, T, C)

            # 8. Projeção Linear de Saída
            out = self.out_proj(context)

            if return_attention_weights:
                return out, attention_weights
            return out


    class FeedForwardNetwork(nn.Module):
        """
        Rede Feed-Forward Ponto-a-Ponto (Position-Wise MLP).
        Expande a dimensão por um fator 4 e aplica a ativação não-linear GELU.
        """
        def __init__(self, d_model: int = 64, expansion_factor: int = 4):
            super().__init__()
            d_ff = expansion_factor * d_model
            self.net = nn.Sequential(
                nn.Linear(d_model, d_ff),
                nn.GELU(),
                nn.Linear(d_ff, d_model)
            )

        def forward(self, x: torch.Tensor) -> torch.Tensor:
            return self.net(x)


    class TransformerBlock(nn.Module):
        """
        Bloco Decodificador Transformer com arquitetura Pre-LN (LayerNorm antes das subcamadas)
        e conexões residuais (Skip Connections).
        """
        def __init__(self, d_model: int = 64, n_heads: int = 4, max_seq_len: int = 128):
            super().__init__()
            self.ln1 = nn.LayerNorm(d_model)
            self.attn = CausalSelfAttention(d_model, n_heads, max_seq_len)
            self.ln2 = nn.LayerNorm(d_model)
            self.ffn = FeedForwardNetwork(d_model)

        def forward(self, x: torch.Tensor, return_attention: bool = False):
            # Pre-LN Self-Attention + Residual
            norm_x = self.ln1(x)
            if return_attention:
                attn_out, attn_weights = self.attn(norm_x, return_attention_weights=True)
                x = x + attn_out
            else:
                x = x + self.attn(norm_x)

            # Pre-LN Feed-Forward + Residual
            x = x + self.ffn(self.ln2(x))

            if return_attention:
                return x, attn_weights
            return x


    class MiniGPT(nn.Module):
        """
        Modelo de Linguagem Autoregressivo Completo (Decoder-only Transformer).
        """
        def __init__(self, vocab_size: int = 50, d_model: int = 64, n_heads: int = 4, n_layers: int = 2, max_seq_len: int = 128):
            super().__init__()
            self.max_seq_len = max_seq_len
            
            # Embeddings de Tokens e Posicionais
            self.token_embedding = nn.Embedding(vocab_size, d_model)
            self.pos_embedding = nn.Embedding(max_seq_len, d_model)

            # Pilha de Blocos Transformer
            self.blocks = nn.ModuleList([
                TransformerBlock(d_model, n_heads, max_seq_len) for _ in range(n_layers)
            ])

            # LayerNorm Final e Cabeça de Vocabulário (Unembedding Head)
            self.final_ln = nn.LayerNorm(d_model)
            self.lm_head = nn.Linear(d_model, vocab_size, bias=False)

            # Técnica de Weight Tying (compartilha pesos entre embedding de entrada e saída)
            self.lm_head.weight = self.token_embedding.weight

        def forward(self, token_ids: torch.Tensor, return_attention: bool = False):
            B, T = token_ids.shape
            assert T <= self.max_seq_len, f"Sequência com {T} tokens excede max_seq_len {self.max_seq_len}"

            # 1. Posições [0, 1, ..., T-1]
            positions = torch.arange(0, T, device=token_ids.device).unsqueeze(0)

            # 2. Soma: Embedding Semântico + Embedding Posicional
            x = self.token_embedding(token_ids) + self.pos_embedding(positions)

            # 3. Passagem pelos blocos decodificadores
            all_attns = []
            for block in self.blocks:
                if return_attention:
                    x, attn_w = block(x, return_attention=True)
                    all_attns.append(attn_w)
                else:
                    x = block(x)

            # 4. LayerNorm Final
            x = self.final_ln(x)

            # 5. Projeção nos Logits do Vocabulário: [B, T, vocab_size]
            logits = self.lm_head(x)

            if return_attention:
                return logits, all_attns
            return logits

        @torch.no_grad()
        def generate(self, input_ids: torch.Tensor, max_new_tokens: int = 5, temperature: float = 0.7, top_k: int = 5):
            """
            Geração Autoregressiva de tokens passo a passo.
            """
            self.eval()
            current_ids = input_ids.clone()

            for _ in range(max_new_tokens):
                # 1. Forward pass
                logits = self(current_ids)  # [B, T, vocab_size]

                # 2. Pegar apenas os logits da última posição temporal
                next_token_logits = logits[:, -1, :]  # [B, vocab_size]

                # 3. Aplicar Temperatura
                scaled_logits = next_token_logits / max(temperature, 1e-4)

                # 4. Filtragem Top-K
                if top_k is not None:
                    topk_vals, _ = torch.topk(scaled_logits, min(top_k, scaled_logits.size(-1)))
                    min_val = topk_vals[:, -1].unsqueeze(-1)
                    scaled_logits = torch.where(scaled_logits < min_val, torch.full_like(scaled_logits, float('-inf')), scaled_logits)

                # 5. Softmax para probabilidades
                probs = F.softmax(scaled_logits, dim=-1)

                # 6. Amostragem ou Argmax
                if temperature < 0.1:
                    next_token = torch.argmax(probs, dim=-1, keepdim=True)
                else:
                    next_token = torch.multinomial(probs, num_samples=1)

                # 7. Concatenar o novo token à sequência gerada
                current_ids = torch.cat([current_ids, next_token], dim=1)

            return current_ids


def run_pytorch_demo():
    """Executa demonstração no terminal do fluxo matemático do Transformer"""
    if not TORCH_AVAILABLE:
        fallback_py = os.path.expandvars(r"%LOCALAPPDATA%\Programs\Python\Python314\python.exe")
        if os.path.exists(fallback_py) and os.path.abspath(sys.executable).lower() != os.path.abspath(fallback_py).lower():
            import subprocess
            subprocess.run([fallback_py, os.path.abspath(__file__), "--demo"], check=False)
            return
        print("[ERRO] PyTorch não está instalado ou foi bloqueado neste interpretador Python.")
        return

    print("=" * 70)
    print("DEMONSTRAÇÃO DEEP LEARNING: FORWARD PASS DO TRANSFORMER (PYTORCH)")
    print("=" * 70)

    # Mini Vocabulário de Brinquedo
    vocab = ["<pad>", "o", "modelo", "transformer", "prevê", "a", "próxima", "palavra", "com", "atenção"]
    token2id = {w: i for i, w in enumerate(vocab)}
    id2token = {i: w for i, w in enumerate(vocab)}
    vocab_size = len(vocab)

    print(f"Vocabulário de Exemplo ({vocab_size} tokens): {vocab}")

    # Frase de teste: "o modelo transformer prevê a próxima"
    prompt_words = ["o", "modelo", "transformer", "prevê", "a", "próxima"]
    input_ids = torch.tensor([[token2id[w] for w in prompt_words]], dtype=torch.long)
    print(f"\nPrompt de Entrada: '{' '.join(prompt_words)}'")
    print(f"IDs de Entrada: {input_ids.tolist()[0]}")

    # Instanciando o modelo
    torch.manual_seed(42)
    model = MiniGPT(vocab_size=vocab_size, d_model=32, n_heads=4, n_layers=2, max_seq_len=32)
    model.eval()

    # Passagem Direta (Forward Pass)
    logits, attns = model(input_ids, return_attention=True)
    last_token_logits = logits[0, -1, :]
    probs = F.softmax(last_token_logits / 0.7, dim=-1)

    print(f"\n[1] Saída do Modelo:")
    print(f"    Dimensão do Tensor de Logits: {list(logits.shape)} (Batch=1, SeqLen={input_ids.size(1)}, VocabSize={vocab_size})")
    print(f"    Dimensão da Matriz de Atenção (Camada 1): {list(attns[0].shape)} (Batch=1, Heads=4, T={input_ids.size(1)}, T={input_ids.size(1)})")

    print(f"\n[2] Distribuição de Probabilidades para o Próximo Token (Temperatura = 0.7):")
    ranked_indices = torch.argsort(probs, descending=True)
    for rank, idx in enumerate(ranked_indices[:5].tolist()):
        print(f"    #{rank+1}: '{id2token[idx]}' (ID: {idx:2d}) -> Probabilidade: {probs[idx].item()*100:.2f}% | Logit: {last_token_logits[idx].item():.2f}")

    # Geração de 3 novos tokens
    generated = model.generate(input_ids, max_new_tokens=3, temperature=0.7, top_k=3)
    generated_words = [id2token[idx] for idx in generated[0].tolist()]
    print(f"\n[3] Sequência Completa após Geração Autoregressiva:")
    print(f"    \"{' '.join(generated_words)}\"")
    print("=" * 70)


# =============================================================================
# 2. SERVIDOR WEB LOCAL
# =============================================================================

class NoCacheHandler(SimpleHTTPRequestHandler):
    """Servidor estático que impede o navegador de reutilizar versões antigas dos arquivos."""
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()


def start_server(port: int = 8000, open_browser: bool = True):
    """Inicia um servidor web HTTP local para visualizar a interface interativa."""
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    server_address = ('', port)
    
    print("=" * 70)
    print(f"🚀 INICIANDO TRANSFORMER EXPLAINER LOCAL")
    print(f"📡 Servidor ativo em: http://localhost:{port}")
    print(f"📖 Pressione CTRL+C no terminal para encerrar o servidor.")
    print("=" * 70)

    if open_browser:
        webbrowser.open(f"http://localhost:{port}/index.html")

    try:
        httpd = HTTPServer(server_address, NoCacheHandler)
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n[INFO] Servidor local finalizado com sucesso.")


# =============================================================================
# 3. PONTO DE ENTRADA (CLI)
# =============================================================================

def main():
    parser = argparse.ArgumentParser(description="Transformer Explainer Interativo & Demonstração PyTorch")
    parser.add_argument("--serve", action="store_true", help="Inicia o servidor web local e abre a interface no navegador")
    parser.add_argument("--demo", action="store_true", help="Executa a demonstração passo a passo do forward pass em PyTorch no terminal")
    parser.add_argument("--port", type=int, default=8000, help="Porta do servidor HTTP (padrão: 8000)")
    parser.add_argument("--no-browser", action="store_true", help="Não abre automaticamente o navegador ao iniciar o servidor")

    args = parser.parse_args()

    if args.demo:
        run_pytorch_demo()
    else:
        # Padrão: iniciar o servidor web
        start_server(port=args.port, open_browser=not args.no_browser)


if __name__ == "__main__":
    main()

