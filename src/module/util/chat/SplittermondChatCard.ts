import {
    SplittermondChatCardData,
    SplittermondChatCardModel,
    SplittermondChatMessage
} from "../../data/SplittermondChatCardModel";
import {getFromRegistry} from "./chatMessageRegistry";
import {foundryApi} from "../../api/foundryApi";
import SplittermondActor from "../../actor/actor";
import {ChatMessageTypes} from "../../api/foundryTypes";
import { Roll } from "module/api/Roll";

interface ChatMessageConfig {
    type: ChatMessageTypes;
    mode?: string;
    whisper: string[];
    blind: boolean;
    rolls: Roll[];
}

export class SplittermondChatCard extends SplittermondChatCardModel {

    /**
     * @param actor The message inducing actor. Will take a user as speaker if null
     * @param message The message content object
     * @param chatOptions
     */
    static create(actor: SplittermondActor|null, message: SplittermondChatMessage, chatOptions: ChatMessageConfig): SplittermondChatCard {
        const speaker = foundryApi.getSpeaker({actor});
        const normalizedChatOptions = {
            ...chatOptions,
            rolls: chatOptions.rolls.map(r => JSON.stringify(r)),
        }

        return new SplittermondChatCard({
            speaker,
            chatOptions: normalizedChatOptions,
            message,
            messageId: null /*We set the ID internally*/,
        }, foundryApi);
    }

    constructor(model: SplittermondChatCardData, private foundryApiWrapper: typeof foundryApi) {
        super(model);
    }

    async sendToChat() {
        const content = await this.render();

        const chatData = {
            blind: this.chatOptions.blind,
            user: this.foundryApiWrapper.currentUser.id,
            speaker: this.speaker,
            rolls: this.chatOptions.rolls,
            whisper: this.chatOptions.whisper,
            type: this.chatOptions.type,
            content: content,
            flags: {
                splittermond: {
                    chatCard: this.toObject(false),
                },
            },
        };

        const message = await this.foundryApiWrapper.createChatMessage(chatData);

        this.updateSource({messageId: message.id});
        await this.updateMessage();
    }

    async updateMessage() {
        const message = this.getMessage();

        if (!message) {
            this.foundryApiWrapper.warnUser("splittermond.chatCard.messageNotFound");
            return Promise.resolve();
        }

        const content = await this.render();
        return await message.update({content, flags: {splittermond: {chatCard: this.toObject(false)}}});//we store the data model portion of this object on the chat message
    }

    getMessage() {
        if (this.messageId === null) {
            return null;
        }
        return this.foundryApiWrapper.messages?.get(this.messageId);
    }

    async render() {
        return await this.foundryApiWrapper.renderer(this.message.template, this.message.getData());
    }
}

/**
 * @param data the dataset that was on the invoked element. Should contain an action to execute.
 * @param messageId the chat card message id
 */
export async function handleChatAction(data: unknown, messageId: string): Promise<void> {
    const chatCard = getChatCard(messageId);
    const isObjectWithAction = data && typeof data === "object" && "action" in data

    if (isObjectWithAction && canBeKey(data.action)) {
        await chatCard.message.handleGenericAction({...data, action: data.action})
            .catch(() => throwNoActionError(chatCard, data, messageId))
        await chatCard.updateMessage();
    } else {
        throwNoActionError(chatCard, data, messageId);
    }
}

export async function handleLocalChatAction(data: unknown, messageId: string) {
    const chatCard = getChatCard(messageId);
    const isObjectWithAction = data && typeof data === "object" && "localaction" in data
    if (isObjectWithAction && canBeKey(data.localaction)) {
        return chatCard.message.handleGenericAction({...data, action: data.localaction})
            .catch(() => throwNoActionError(chatCard, data, messageId))
    } else {
        throwNoActionError(chatCard, data, messageId);
    }
}

function getChatCard(messageId: string): SplittermondChatCard {
    const chatCard = foundryApi.messages.get(messageId)
    const chatCardFlag = chatCard.getFlag("splittermond", "chatCard") as SplittermondChatCardData;
    const constructor = getFromRegistry(chatCardFlag.message.constructorKey)
    const messageObject = new constructor(chatCardFlag.message);

    return new SplittermondChatCard({
        ...chatCardFlag,
        message: messageObject,
    }, foundryApi);

}

function canBeKey(input: unknown): input is string {
    return typeof input === "string";
}

function throwNoActionError(chatCard: SplittermondChatCard, data: any, messageId: string) {
    foundryApi.warnUser("splittermond.chatCard.actionNotFound");
    throw new Error(`Action ${data.action} not found on chat card for message ${chatCard.message.constructorKey} with ${messageId}`);
}

