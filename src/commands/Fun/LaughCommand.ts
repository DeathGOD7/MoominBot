import { Client, MessageEmbed, CommandInteraction } from "discord.js";
import { inject, injectable } from "tsyringe";
import BaseCommand from "#base/BaseCommand";
import { kClient } from "#utils/tokens";
import fetch from "node-fetch";

interface LaughResponse {
    image: string;
}

@injectable()
export default class extends BaseCommand {
    constructor(@inject(kClient) public readonly client: Client<true>) {
        super({
            name: "laugh",
            category: "Fun"
        });
    }

    async execute(interaction: CommandInteraction) {
        const user = interaction.options.getUser("user") || interaction.user!;
        const { image } = (await fetch("http://api.nekos.fun:8080/api/laugh").then((res) => res.json())) as LaughResponse;

        const embed = new MessageEmbed()
            .setAuthor(`${interaction.user.tag} laughs ${user === interaction.user ? "randomly." : `at ${user.tag}`}`)
            .setImage(image)
            .setColor("BLURPLE")
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
}
