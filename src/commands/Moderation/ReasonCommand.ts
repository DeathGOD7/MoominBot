import BaseCommand from "#base/BaseCommand";
import { inject, injectable } from "tsyringe";
import { kClient, kPrisma } from "#utils/tokens";
import { Client, CommandInteraction, Permissions, MessageEmbed, GuildTextBasedChannel } from "discord.js";
import { ModLogCase } from "#utils/ModLogCase";
import type { PrismaClient } from "@prisma/client";

@injectable()
export default class extends BaseCommand {
    constructor(@inject(kClient) public readonly client: Client<true>, @inject(kPrisma) public prisma: PrismaClient) {
        super({
            name: "reason",
            category: "Moderation"
        });
    }

    async execute(interaction: CommandInteraction) {
        await interaction.deferReply({ ephemeral: true });

        if (!interaction.memberPermissions?.has(Permissions.FLAGS.MANAGE_MESSAGES)) {
            return await interaction.followUp({ content: "You don't have the required permissions to run this command", ephemeral: true });
        }

        const server = await this.prisma.guild.findFirst({
            where: {
                id: interaction.guildId
            }
        });

        if (!server || !server.modlog || !interaction.guild?.channels.cache.has(server.modlog)) {
            return await interaction.followUp({ content: "No mod log channel found for this server" });
        }

        const modLogChannel = interaction.guild.channels.cache.get(server.modlog) as GuildTextBasedChannel;
        if (!modLogChannel?.permissionsFor(interaction.guild.me!)?.has([Permissions.FLAGS.SEND_MESSAGES, Permissions.FLAGS.EMBED_LINKS])) {
            return await interaction.followUp({ content: "I am not allowed to send messages to the mod log channel" });
        }

        const caseId = interaction.options.getNumber("case", true);
        const reason = interaction.options.getString("reason", true);

        const entry = await this.prisma.modLogCase.findFirst({
            where: {
                case_id: caseId,
                guild: interaction.guildId
            }
        });

        if (!entry) return await interaction.followUp({ content: "❌ | No entry found with that case id" });

        const updatedEntry = await this.prisma.modLogCase.update({
            where: {
                id: entry.id
            },
            data: {
                reason: `${reason}`
            }
        });

        const entryCase = new ModLogCase({
            guild: updatedEntry.guild,
            reason: updatedEntry.reason,
            moderator: updatedEntry.moderator,
            target: updatedEntry.target,
            timestamp: new Date(updatedEntry.timestamp).getTime(),
            type: updatedEntry.type
        });

        const logEmbed = new MessageEmbed()
            .setColor(entryCase.color)
            .setTimestamp(entryCase.timestamp)
            .setTitle(`${entryCase.type} | case #${updatedEntry.case_id}`)
            .addField("User", `${this.client.users.cache.get(updatedEntry.target)?.tag || "Unknown"} (\`${updatedEntry.target}\`)`, true)
            .addField(
                "Moderator",
                `${this.client.users.cache.get(updatedEntry.moderator)?.tag || interaction.user.tag} (\`${updatedEntry.moderator || interaction.user.id}\`)`,
                true
            )
            .addField("Reason", updatedEntry.reason === "N/A" ? `Moderator do \`/reason ${updatedEntry.case_id} <reason>\`` : updatedEntry.reason, false)
            .setFooter(`Entry id: ${updatedEntry.id}`);

        await interaction.followUp({ embeds: [logEmbed], content: "♾️ Case Update Preview" });
        const logChannel = this.client.guilds.cache.get(server.id)?.channels.cache.get(updatedEntry.channel!) as GuildTextBasedChannel | undefined;
        const loggedMessage = await logChannel?.messages.fetch(updatedEntry.message!).catch(() => null);
        if (!loggedMessage || !loggedMessage.editable)
            return await (this.client.channels.cache.get(server.modlog) as GuildTextBasedChannel)
                ?.send({
                    embeds: [logEmbed]
                })
                .then(async (m) => {
                    await this.prisma.modLogCase.update({
                        data: {
                            channel: m.channelId,
                            message: m.id
                        },
                        where: {
                            id: updatedEntry.id
                        }
                    });
                })
                .catch(() => null);

        await loggedMessage
            .edit({
                embeds: [logEmbed]
            })
            .catch(() => null);
    }
}
