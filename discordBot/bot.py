import requests
import importlib

import discord
from discord.ext import commands

discordTokens = importlib.import_module('discord_token')
baseUrl = "http://127.0.0.1:3000"
deleteDelay = 10

bot = commands.Bot(command_prefix='?', case_insensitive=True)

@bot.command()
async def board(ctx):
    reqUrl = "%s/api/create/%s" % (baseUrl, discordTokens.boardID)
    r = requests.get(url = reqUrl)
    data = r.json()
    print(data)
    if(data['status'] == "OK"):
        boardUrl = "%s/board/%s" % (baseUrl, data['roomCode'])
        await ctx.send("A board has been created! Please follow this link: " + boardUrl)
    else:
        await ctx.send("Couldn't create a board. Status code: %s" % data['status'])


bot.run(discordTokens.token)
