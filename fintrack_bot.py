import os, re, datetime, requests
from telegram import Update
from telegram.ext import Application, MessageHandler, CommandHandler, filters, ContextTypes

BOT_TOKEN     = "899999999:xxxxxxxxxxxxxxxxxxxxxxxxxxxx"        # ou os.environ["BOT_TOKEN"] se usar variavel
ALLOWED_USERS = [222222222, 222222222]  # IDs de voce e sua namorada
SERVER_URL    = "http://localhost:5000"


def get_name(user):
    return user.first_name or user.username or str(user.id)

def month_key(offset=0):
    now = datetime.datetime.now()
    m   = now.month - 1 + offset
    y   = now.year + m // 12
    m   = m % 12 + 1
    return f"{y}-{m}"

def month_label(offset=0):
    now    = datetime.datetime.now()
    m      = now.month - 1 + offset
    y      = now.year + m // 12
    m      = m % 12 + 1
    meses  = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"]
    return f"{meses[m-1]}/{y}"

def api_post(path, data):
    return requests.post(f"{SERVER_URL}{path}", json=data, timeout=10).json()

def api_get():
    return requests.get(f"{SERVER_URL}/data", timeout=10).json()


# ── /start ────────────────────────────────────────────────────────────────────

async def cmd_start(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    if update.effective_user.id not in ALLOWED_USERS:
        return
    await update.message.reply_text(
        "FinTrack ativo!\n\n"
        "Registrar gasto:\n"
        "  150 comida\n"
        "  89.90 transporte uber\n\n"
        "Registrar parcelado:\n"
        "  roupa 4x 100\n"
        "  viagem 3x 250 ferias\n\n"
        "Comandos:\n"
        "  /ultimos — ultimas 5 entradas\n"
        "  /parcelas — parcelas futuras\n"
        "  /editar ID valor categoria\n"
        "  /deletar ID\n"
        "  /resumo — total do mes"
    )


# ── /resumo ───────────────────────────────────────────────────────────────────

async def cmd_resumo(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    if update.effective_user.id not in ALLOWED_USERS:
        return
    data = api_get()
    mk   = month_key()
    exps = [e for e in data["expenses"] if e.get("monthKey") == mk]
    if not exps:
        await update.message.reply_text("Nenhum gasto este mes.")
        return
    totals = {}
    for e in exps:
        totals[e["cat"]] = totals.get(e["cat"], 0) + e["amount"]
    total    = sum(totals.values())
    linhas   = "\n".join(f"  {c}: R$ {v:.2f}" for c, v in sorted(totals.items(), key=lambda x: -x[1]))
    saldo    = data.get("balance", 0)
    restante = saldo - total
    await update.message.reply_text(
        f"Resumo do mes:\n{linhas}\n\n"
        f"Total: R$ {total:.2f}\n"
        f"Saldo: R$ {saldo:.2f}\n"
        f"Restante: R$ {restante:.2f}"
    )


# ── /parcelas ─────────────────────────────────────────────────────────────────

async def cmd_parcelas(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    if update.effective_user.id not in ALLOWED_USERS:
        return
    data    = api_get()
    futuras = [e for e in data["expenses"] if e.get("parcela") and e.get("monthKey", "") > month_key()]
    if not futuras:
        await update.message.reply_text("Nenhuma parcela futura registrada.")
        return
    # agrupar por mes
    por_mes = {}
    for e in futuras:
        por_mes.setdefault(e["monthKey"], []).append(e)
    linhas = []
    for mk in sorted(por_mes.keys()):
        total_mes = sum(e["amount"] for e in por_mes[mk])
        itens = ", ".join(f"{e['cat']} R$ {e['amount']:.2f}" for e in por_mes[mk])
        linhas.append(f"  {mk}: {itens} (total R$ {total_mes:.2f})")
    await update.message.reply_text("Parcelas futuras:\n" + "\n".join(linhas))


# ── /ultimos ──────────────────────────────────────────────────────────────────

async def cmd_ultimos(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    if update.effective_user.id not in ALLOWED_USERS:
        return
    data = api_get()
    mk   = month_key()
    mes  = [(i, e) for i, e in enumerate(data["expenses"]) if e.get("monthKey") == mk]
    if not mes:
        await update.message.reply_text("Nenhum gasto este mes.")
        return
    linhas = []
    for idx, e in mes[-5:]:
        desc    = f" ({e['desc']})" if e.get("desc") else ""
        parcela = f" [{e['parcela']}]" if e.get("parcela") else ""
        who     = e.get("user", "?")
        linhas.append(f"[{idx}] R$ {e['amount']:.2f} — {e['cat']}{desc}{parcela} ({who}, {e['date']})")
    await update.message.reply_text(
        "Ultimas entradas:\n" + "\n".join(linhas) +
        "\n\nUse /editar ID valor categoria ou /deletar ID"
    )


# ── /editar ───────────────────────────────────────────────────────────────────

async def cmd_editar(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    if update.effective_user.id not in ALLOWED_USERS:
        return
    args = ctx.args
    if len(args) < 3:
        await update.message.reply_text("Uso: /editar ID valor categoria\nEx: /editar 4 200 aluguel")
        return
    try:
        idx    = int(args[0])
        amount = float(args[1])
        cat    = " ".join(args[2:]).lower()
    except ValueError:
        await update.message.reply_text("Formato invalido.")
        return
    res = api_post("/expense/edit", {"index": idx, "amount": amount, "cat": cat})
    if res.get("ok"):
        await update.message.reply_text(f"Entrada [{idx}] atualizada: R$ {amount:.2f} em '{cat}'.")
    else:
        await update.message.reply_text("Erro: ID invalido. Use /ultimos.")


# ── /deletar ──────────────────────────────────────────────────────────────────

async def cmd_deletar(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    if update.effective_user.id not in ALLOWED_USERS:
        return
    if not ctx.args:
        await update.message.reply_text("Uso: /deletar ID\nEx: /deletar 4")
        return
    try:
        idx = int(ctx.args[0])
    except ValueError:
        await update.message.reply_text("ID invalido.")
        return
    data    = api_get()
    entries = data.get("expenses", [])
    if idx < 0 or idx >= len(entries):
        await update.message.reply_text("ID invalido. Use /ultimos.")
        return
    removed = entries[idx]
    res     = api_post("/expense/delete", {"index": idx})
    if res.get("ok"):
        await update.message.reply_text(
            f"Entrada [{idx}] removida:\n"
            f"R$ {removed['amount']:.2f} em '{removed['cat']}' ({removed['date']})"
        )
    else:
        await update.message.reply_text("Erro ao deletar.")


# ── mensagem (gasto normal ou parcelado) ──────────────────────────────────────

async def handle_message(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    if user.id not in ALLOWED_USERS:
        return
    msg  = update.message or update.edited_message
    text = msg.text.strip()
    name = get_name(user)
    now  = datetime.datetime.now()

    # ── parcelado: "roupa 4x 100" ou "viagem 3x 250 ferias" ──
    match_parc = re.match(
        r"^(\S+)\s+(\d+)x\s+(\d+(?:\.\d{1,2})?)(?:\s+(.+))?$",
        text, re.IGNORECASE
    )
    if match_parc:
        cat        = match_parc.group(1).lower()
        parcelas   = int(match_parc.group(2))
        valor_parc = float(match_parc.group(3))
        desc       = match_parc.group(4) or ""

        if parcelas < 1 or parcelas > 60:
            await msg.reply_text("Numero de parcelas invalido (1 a 60).")
            return

        confirmacoes = []
        for i in range(parcelas):
            mk    = month_key(i)
            label = month_label(i)
            api_post("/expense", {
                "amount":   valor_parc,
                "cat":      cat,
                "desc":     desc,
                "date":     now.strftime("%d/%m/%Y"),
                "monthKey": mk,
                "user":     name,
                "parcela":  f"{i+1}/{parcelas}",
            })
            confirmacoes.append(f"  {label}: R$ {valor_parc:.2f} ({i+1}/{parcelas})")

        total = valor_parc * parcelas
        await msg.reply_text(
            f"Parcelado registrado: {cat}\n"
            + "\n".join(confirmacoes)
            + f"\n\nTotal: R$ {total:.2f}"
        )
        return

    # ── gasto normal: "150 comida" ────────────────────────────
    match_normal = re.match(r"^(\d+(?:\.\d{1,2})?)\s+(\S+)(?:\s+(.+))?$", text)
    if match_normal:
        amount   = float(match_normal.group(1))
        category = match_normal.group(2).lower()
        desc     = match_normal.group(3) or ""
        mk       = month_key()

        api_post("/expense", {
            "amount":   amount,
            "cat":      category,
            "desc":     desc,
            "date":     now.strftime("%d/%m/%Y"),
            "monthKey": mk,
            "user":     name,
        })

        data        = api_get()
        exps        = data.get("expenses", [])
        cat_total   = sum(e["amount"] for e in exps if e["cat"] == category and e.get("monthKey") == mk)
        month_total = sum(e["amount"] for e in exps if e.get("monthKey") == mk)

        await msg.reply_text(
            f"{name} adicionou R$ {amount:.2f} em '{category}'\n"
            f"{category} este mes: R$ {cat_total:.2f}\n"
            f"Total do mes: R$ {month_total:.2f}"
        )
        return

    await msg.reply_text(
        "Formato nao reconhecido.\n"
        "Gasto normal: 150 comida\n"
        "Parcelado: roupa 4x 100"
    )


# ── main ──────────────────────────────────────────────────────────────────────

def main():
    app = Application.builder().token(BOT_TOKEN).build()
    app.add_handler(CommandHandler("start",    cmd_start))
    app.add_handler(CommandHandler("resumo",   cmd_resumo))
    app.add_handler(CommandHandler("ultimos",  cmd_ultimos))
    app.add_handler(CommandHandler("parcelas", cmd_parcelas))
    app.add_handler(CommandHandler("editar",   cmd_editar))
    app.add_handler(CommandHandler("deletar",  cmd_deletar))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))
    print("Bot rodando.")
    app.run_polling()


if __name__ == "__main__":
    main()
