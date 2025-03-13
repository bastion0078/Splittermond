import {handleChatAction, handleLocalChatAction} from "./SplittermondChatCard";
import {foundryApi} from "../../api/foundryApi";
import {canEditMessageOf} from "../chat.js";
import {ChatMessage} from "../../api/foundryTypes";

const socketEvent = "system.splittermond";

export function chatActionFeature() {
    foundryApi.hooks.on("renderChatLog", (_app:unknown, html:JQuery, _data:unknown) => chatListeners(html));
    foundryApi.hooks.on("renderChatPopout", (_app:unknown, html:JQuery, _data:unknown) => chatListeners(html));
    foundryApi.hooks.on("renderChatMessage", (_app:ChatMessage, html:JQuery, _data:unknown) => prohibitActionOnChatCard(_app, html, _data));

    foundryApi.hooks.once("init", () => {
        foundryApi.socket.on(socketEvent, (data) => {

            if(!(data && typeof data === "object" && "type" in data && "messageId" in data && "userId" in data)) {
                return Promise.resolve();
            }
            if (data.type === "chatAction") {
                if (!foundryApi.currentUser.isGM) {
                    return Promise.resolve();
                }
                const connectedGMs = foundryApi.users.filter((u) => u.isGM && u.active);
                const isResponsibleGM = !connectedGMs.some((other) => other.id < foundryApi.currentUser.id);
                if (!isResponsibleGM) {
                    return Promise.resolve();
                }

                const {messageId, userId} = data;
                //@ts-expect-error a
                return handleChatAction(data, messageId, userId);
            }
            return Promise.resolve();
        });
    });
}

function chatListeners(html:JQuery) {
    html.on("click", ".splittermond-chat-action[data-action]", onChatCardAction);
    html.on("click", ".splittermond-chat-action[data-localAction]", onLocalChatCardAction)
}

async function onChatCardAction(event: Event) {
    event.preventDefault();

    const button = event.currentTarget as HTMLElement /*We're working in an HTML Context here. that the target is an HTMLElement is a given*/;
    const dataAttributes = button.dataset;
    const messageElement = button.closest(".message")as HTMLElement/*We're working in an HTML Context here. that the target is an HTMLElement is a given*/;
    const messageId = messageElement.dataset.messageId;

    if (!foundryApi.currentUser.isGM) {
        if (!foundryApi.users.filter((u) => u.isGM && u.active).length) {
            return foundryApi.warnUser("splittermond.chatCard.noGMConnected");
        }

        return foundryApi.socket.emit(socketEvent, {
            type: "chatAction",
            ...dataAttributes,
            messageId,
            userId: foundryApi.currentUser.id,
        });
    }
    if(messageId === undefined) {
        return foundryApi.warnUser("splittermond.chatCard.messageIdNotFound");
    }
    return await handleChatAction(dataAttributes, messageId);
}

async function onLocalChatCardAction(event:Event) {
    const button = event.currentTarget as HTMLElement /*We're working in an HTML Context here. that the target is an HTMLElement is a given*/;
    const messageElement = button.closest(".message") as HTMLElement/*We're working in an HTML Context here. that the target is an HTMLElement is a given*/;
    const messageId = messageElement.dataset.messageId;
    if(messageId === undefined) {
        return foundryApi.warnUser("splittermond.chatCard.messageIdNotFound");
    }
    return await handleLocalChatAction(button.dataset, messageId);
}

/**
 *  We have to rely on JQuery to edit user access rights, because actual message evaluation is only done by the GM
 *  who always has edit rights.
 */
function prohibitActionOnChatCard(__:unknown, html:JQuery, data:unknown) {
    if(!dataHasRequiredAttributes(data)) {
       throw new Error("data parameter is expected to be an object with keys 'message' and 'author', but it was not.") ;
    }
    let actor = foundryApi.getSpeaker(data.message.speaker).actor;

    if (!((actor && foundryApi.getActor(actor)?.isOwner) || canEditMessageOf(data.author.id))) {
        html.find(".splittermond-chat-action[data-action]").not(".splittermond-chat-action[data-localaction]").remove();
    }

    html.find(".splittermond-chat-action-container").not(":has(.splittermond-chat-action)").remove();
}

function dataHasRequiredAttributes(data:unknown): data is { message:{speaker:object}, author:{id:string} } {
    return !!data && typeof data === "object"
        && "message" in data && !!data.message && typeof (data.message) === "object" && "speaker" in data.message
        && "author" in data  && !!data.author && typeof (data.author) === "object" && "id" in data.author;
}
