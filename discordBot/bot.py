import requests
import importlib

import discord
from discord.ext import commands

discordTokens = importlib.import_module('discord_tokens')
baseUrl = "https://discord-notes.herokuapp.com"
deleteDelay = 10

bot = commands.Bot(command_prefix='?', case_insensitive=True)

@bot.event
async def on_ready():
    print('Bot is ready')

@bot.command()
async def board(ctx):
    reqUrl = "%s/api/create/%s" % (baseUrl, discordTokens.boardID)
    r = requests.get(url = reqUrl)
    data = r.json()
    if(data['status'] == "OK"):
        boardUrl = "%s/board/%s" % (baseUrl, data['roomCode'])
        await ctx.author.send("Here is the link to the created room: %s \nHere is the host ID to give you muting and kicking privileges: %s" % (boardUrl, str(data['hostCode'])))
        await ctx.send("A board has been created! Please follow this link: " + boardUrl)
    else:
        await ctx.send("Couldn't create a board. Status code: %s" % data['status'])


bot.run(discordTokens.token)
