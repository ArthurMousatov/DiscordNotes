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
async def board(ctx, *args):
    reqUrl = "%s/api/create/%s" % (baseUrl, discordTokens.boardID)
    try:
        r = requests.get(url = reqUrl)
        data = r.json()
    except:
        ctx.send("Error occured during board creation. API might be down, sorry!")
    if(data['status'] == "OK"):
        boardUrl = "%s/board/%s" % (baseUrl, data['roomCode'])
        if len(args) > 0:
            for arg in args:
                #print(arg[3:-1])
                member = None
                try:
                    member = ctx.guild.get_member(int(arg[3:-1]))
                    break
                except:
                    await ctx.send("Error occured during board sharing. Make sure the @meantions are correct!")
                if member and not member.bot:
                    print("Sending board to: %s" % member.nick)
                    await member.send("A board has been created! Please follow this link: " + boardUrl)
        else:
            await ctx.send("A board has been created! Please follow this link: " + boardUrl)
        await ctx.author.send("A board has been created! Please follow this link: %s\n Here is the host ID to give you muting and kicking privileges: %s" % (boardUrl, str(data['hostCode'])))
    else:
        await ctx.send("Couldn't create a board. Status code: %s" % data['status'])
    await ctx.message.delete(delay=3)


bot.run(discordTokens.token)
