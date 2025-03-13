export class LanguageMapper<T extends string>{
    private translationsAsKeys: Map<string, T> = new Map();
    private internalsAsKeys: Map<T, string> = new Map();


    constructor(
        translations: Map<T,string>,
        additionalTranslations: Map<string,T> = new Map()){

        additionalTranslations.forEach((value, key) =>this.translationsAsKeys.set(key.toLowerCase(), value));
        translations.forEach((value, key) => {
            this.translationsAsKeys.set(value.toLowerCase(), key)
            this.internalsAsKeys.set(key, value.toLowerCase())
        });
    }

    toTranslation(code: T){
        return this.internalsAsKeys.get(code);
    }

    toCode(translation: string):T|undefined {
        return this.translationsAsKeys.get(translation.toLowerCase());
    }
}