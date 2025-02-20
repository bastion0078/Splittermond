export interface DialogV2RenderOptions {
    force: boolean
}

export interface DialogV2ConstructorInput {
    window: { title: string },
    content: string,
    buttons:
        {
            action: string,
            label: string,
            default: boolean,
            callback: Function
        }[],
    submit: Function,
}

declare namespace foundry {
    namespace applications {
        namespace api {
            export class DialogV2 {
                protected element: HTMLElement;

                constructor(config: DialogV2ConstructorInput);

                static confirm(config: { content: string, rejectClose: boolean, modal: true }): Promise<boolean>;

                //To lazy to actually type this right now.
                static prompt(config: unknown): Promise<unknown>;

                render(options?: DialogV2RenderOptions): Promise<this>;
            }
        }
    }
}


export const FoundryDialog = foundry.applications.api.DialogV2