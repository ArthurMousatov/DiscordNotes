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
    print('Bot has been deployed')

@bot.command()
async def board(ctx, *args):

    botMessage = await ctx.send("Making a room-creation request to the API. May take a couple of seconds!")
    response = RequestRoom("true") if "mute" in args else RequestRoom("false")
    await botMessage.delete(delay=1)

    if(response):

        if(response['status'] == "OK"):
            boardUrl = "%s/board/%s" % (baseUrl, response['roomCode'])

            if "text" in args:
                await ctx.send("A board has been created! Please follow this link: " + boardUrl)
            elif "voice" in args and ctx.author.voice.channel:
                for member in ctx.author.voice.channel.members:
                    if member != ctx.author:
                        await member.send("A board has been created! Please follow this link: " + boardUrl)
            elif "private" in args:
                #Do nothing lole
                print("Do nothing lole")
            else:
                for arg in args:
                    member = ctx.guild.get_member(GetMemberByMention(arg))

                    if member and not member.bot:
                        print("Sending board to: %s" % member.nick)
                        await member.send("A board has been created! Please follow this link: " + boardUrl)
                        
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

def GetMemberByMention(mention: str):
    if mention.startswith("<@!") and mention.endswith(">") and mention[3:-1].isdigit():
        return int(mention[3:-1])
    elif mention.startswith("<@") and mention.endswith(">") and mention[2:-1].isdigit():
        return int(mention[2:-1])
    else:
        return None


bot.run(discordTokens.token)
