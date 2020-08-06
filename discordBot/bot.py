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
    isMuted = "false"

    if "mute" in args:
        isMuted = "true"
        print(isMuted)

    response = RequestRoom(isMuted)

    if(response):

        if(response['status'] == "OK"):
            boardUrl = "%s/board/%s" % (baseUrl, response['roomCode'])

            if "channel" in args and ctx.author.voice.channel:
                for member in ctx.author.voice.channel.members:
                    await member.send("A board has been created! Please follow this link: " + boardUrl)
            else:

                if len(args) > 0:

                    for arg in args:
                        #print(arg[3:-1])
                        member = None

                        try:
                            member = ctx.guild.get_member(int(arg[3:-1]))
                            break
                        except:
                            await ctx.send("Error occured during board sharing. Make sure the @mentions are correct!")

                        if member and not member.bot:
                            print("Sending board to: %s" % member.nick)
                            await member.send("A board has been created! Please follow this link: " + boardUrl)
                else:
                    await ctx.send("A board has been created! Please follow this link: " + boardUrl)
            
            await ctx.author.send("A board has been created! Please follow this link: %s\n Here is the host ID to give you muting and kicking privileges: %s" % (boardUrl, str(response['hostCode'])))
        else:
            await ctx.send("Couldn't create a board. Status code: %s" % response['status'])
    else:
        await ctx.send("Couldn't reach the API, check if the website is down!")
    
    await ctx.message.delete(delay=3)

def RequestRoom(isMuted):
    reqUrl = "%s/api/create/%s/%s" % (baseUrl, discordTokens.boardID, isMuted)

    try:
        r = requests.get(url = reqUrl)
        return r.json()
    except:
        return None


bot.run(discordTokens.token)
