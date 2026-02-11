import React, { useState, useEffect, useRef } from 'react';
import { Settings, Play, Users, Trophy, Clock, Volume2, ChevronLeft, User, Trash2, Sparkles, CheckCircle2, Loader2, Gauge, Zap, Star, LogOut, Home, Search, Globe, Target, ShieldCheck, Eye, Layers, Palette, Monitor } from 'lucide-react';
import { ChatUser } from '../types';
import { chatService } from '../services/chatService';
import { leaderboardService } from '../services/supabase';

interface LogoRoundProps {
    onHome: () => void;
    isOBS?: boolean;
}

interface GameConfig {
    joinKeyword: string;
    maxPlayers: number;
    roundDuration: number;
    // isBlurred removed/ignored - always clear
    autoProgress: boolean;
    totalRounds: number;
    // New aesthetic settings
    showHints: boolean;
    difficulty: 'Easy' | 'Hard';
    soundEffects: boolean;
    streamerMode: boolean;
}

type GamePhase = 'SETUP' | 'LOBBY' | 'PLAYING' | 'REVEAL' | 'FINALE';

interface Brand {
    name: string;
    domain: string;
    aliases: string[];
}

const POPULAR_BRANDS: Brand[] = [
    { name: 'Google', domain: 'google.com', aliases: ['قوقل', 'جوجل'] },
    { name: 'Apple', domain: 'apple.com', aliases: ['ابل', 'أبل'] },
    { name: 'Microsoft', domain: 'microsoft.com', aliases: ['مايكروسوفت'] },
    { name: 'Amazon', domain: 'amazon.com', aliases: ['امازون', 'أمازون'] },
    { name: 'Facebook', domain: 'facebook.com', aliases: ['فيسبوك', 'فيس بوك'] },
    { name: 'Instagram', domain: 'instagram.com', aliases: ['انستقرام', 'إنستغرام', 'انستجرام'] },
    { name: 'Twitter', domain: 'twitter.com', aliases: ['تويتر'] },
    { name: 'YouTube', domain: 'youtube.com', aliases: ['يوتيوب'] },
    { name: 'Netflix', domain: 'netflix.com', aliases: ['نتفلكس', 'نتفليكس'] },
    { name: 'Spotify', domain: 'spotify.com', aliases: ['سبوتيفاي'] },
    { name: 'Nike', domain: 'nike.com', aliases: ['نايكي', 'نايك'] },
    { name: 'Adidas', domain: 'adidas.com', aliases: ['اديداس', 'أديداس'] },
    { name: 'Coca-Cola', domain: 'cocacola.com', aliases: ['كوكاكولا', 'كوكا كولا'] },
    { name: 'Pepsi', domain: 'pepsi.com', aliases: ['ببسي', 'بيبسي'] },
    { name: 'McDonalds', domain: 'mcdonalds.com', aliases: ['ماكدونالدز', 'ماك'] },
    { name: 'Starbucks', domain: 'starbucks.com', aliases: ['ستارباكس'] },
    { name: 'Samsung', domain: 'samsung.com', aliases: ['سامسونج', 'سامسونغ'] },
    { name: 'Toyota', domain: 'toyota.com', aliases: ['تويوتا'] },
    { name: 'Mercedes', domain: 'mercedes-benz.com', aliases: ['مرسيدس'] },
    { name: 'BMW', domain: 'bmw.com', aliases: ['بي ام دبليو', 'بي ام'] },
    { name: 'Tesla', domain: 'tesla.com', aliases: ['تسلا'] },
    { name: 'Sony', domain: 'sony.com', aliases: ['سوني'] },
    { name: 'Disney', domain: 'disney.com', aliases: ['ديزني'] },
    { name: 'Visa', domain: 'visa.com', aliases: ['فيزا'] },
    { name: 'Mastercard', domain: 'mastercard.com', aliases: ['ماستركارد'] },
    { name: 'PayPal', domain: 'paypal.com', aliases: ['بايبال', 'باي بال'] },
    { name: 'Uber', domain: 'uber.com', aliases: ['اوبر', 'أوبر'] },
    { name: 'Airbnb', domain: 'airbnb.com', aliases: ['اير بي ان بي', 'ايربنب'] },
    { name: 'Snapchat', domain: 'snapchat.com', aliases: ['سناب شات', 'سناب'] },
    { name: 'TikTok', domain: 'tiktok.com', aliases: ['تيك توك'] },
    { name: 'WhatsApp', domain: 'whatsapp.com', aliases: ['واتساب', 'واتس اب'] },
    { name: 'Telegram', domain: 'telegram.org', aliases: ['تليجرام', 'تلغرام'] },
    { name: 'Discord', domain: 'discord.com', aliases: ['ديسكورد'] },
    { name: 'Slack', domain: 'slack.com', aliases: ['سلاك'] },
    { name: 'Adobe', domain: 'adobe.com', aliases: ['ادوبي', 'أدوبي'] },
    { name: 'Intel', domain: 'intel.com', aliases: ['انتل', 'أنتل'] },
    { name: 'Nvidia', domain: 'nvidia.com', aliases: ['نيفيديا', 'انفيديا'] },
    { name: 'Red Bull', domain: 'redbull.com', aliases: ['ريدبول', 'ريد بول'] },
    { name: 'Lego', domain: 'lego.com', aliases: ['ليجو', 'ليغو'] },
    { name: 'Ikea', domain: 'ikea.com', aliases: ['ايكيا', 'أيكيا'] },
    { name: 'Rolex', domain: 'rolex.com', aliases: ['رولكس'] },
    { name: 'Gucci', domain: 'gucci.com', aliases: ['قوتشي', 'غوتشي'] },
    { name: 'Louis Vuitton', domain: 'louisvuitton.com', aliases: ['لويس فيتون'] },
    { name: 'Chanel', domain: 'chanel.com', aliases: ['شانيل'] },
    { name: 'Hermes', domain: 'hermes.com', aliases: ['هيرميس'] },
    { name: 'Ferrari', domain: 'ferrari.com', aliases: ['فيراري'] },
    { name: 'Porsche', domain: 'porsche.com', aliases: ['بورش', 'بورشه'] },
    { name: 'Lamborghini', domain: 'lamborghini.com', aliases: ['لامبورجيني', 'لامبورغيني'] },
    { name: 'Bentley', domain: 'bentley.com', aliases: ['بنتلي'] },
    { name: 'Audi', domain: 'audi.com', aliases: ['اودي', 'أودي'] },
    { name: 'Volkswagen', domain: 'volkswagen.com', aliases: ['فولكس فاجن', 'فولكس واجن'] },
    { name: 'Ford', domain: 'ford.com', aliases: ['فورد'] },
    { name: 'Honda', domain: 'honda.com', aliases: ['هوندا'] },
    { name: 'Nissan', domain: 'nissan-global.com', aliases: ['نيسان'] },
    { name: 'Hyundai', domain: 'hyundai.com', aliases: ['هيونداي'] },
    { name: 'Kia', domain: 'kia.com', aliases: ['كيا'] },
    { name: 'Amex', domain: 'americanexpress.com', aliases: ['اميكس'] },
    { name: 'Goldman Sachs', domain: 'goldmansachs.com', aliases: ['غولدمان ساكس'] },
    { name: 'HSBC', domain: 'hsbc.com', aliases: ['اش اس بي سي'] },
    { name: 'Siemens', domain: 'siemens.com', aliases: ['سيمنز', 'سيمنس'] },
    { name: 'GE', domain: 'ge.com', aliases: ['جي اي'] },
    { name: 'Boeing', domain: 'boeing.com', aliases: ['بوينج', 'بوينغ'] },
    { name: 'Airbus', domain: 'airbus.com', aliases: ['ايرباص', 'أيرباص'] },
    { name: 'FedEx', domain: 'fedex.com', aliases: ['فيديكس'] },
    { name: 'UPS', domain: 'ups.com', aliases: ['يو بي اس'] },
    { name: 'DHL', domain: 'dhl.com', aliases: ['دي اتش ال'] },
    { name: 'Oracle', domain: 'oracle.com', aliases: ['اوراكل'] },
    { name: 'IBM', domain: 'ibm.com', aliases: ['اي بي ام'] },
    { name: 'HP', domain: 'hp.com', aliases: ['اتش بي'] },
    { name: 'Dell', domain: 'dell.com', aliases: ['ديل'] },
    { name: 'Cisco', domain: 'cisco.com', aliases: ['سيسكو'] },
    { name: 'Huawei', domain: 'huawei.com', aliases: ['هواوي'] },
    { name: 'Xiaomi', domain: 'mi.com', aliases: ['شاومي'] },
    { name: 'Oppo', domain: 'oppo.com', aliases: ['اوبو'] },
    { name: 'Vivo', domain: 'vivo.com', aliases: ['فيفو'] },
    { name: 'PlayStation', domain: 'playstation.com', aliases: ['بلايستيشن', 'سوني'] },
    { name: 'Xbox', domain: 'xbox.com', aliases: ['اكسبوكس', 'مايكروسوفت'] },
    { name: 'Nintendo', domain: 'nintendo.com', aliases: ['نينتيندو'] },
    { name: 'Twitch', domain: 'twitch.tv', aliases: ['تويتش'] },
    { name: 'Kick', domain: 'kick.com', aliases: ['كيك'] },
    { name: 'SoundCloud', domain: 'soundcloud.com', aliases: ['ساوند كلاود'] },
    { name: 'Pandora', domain: 'pandora.com', aliases: ['باندورا'] },
    { name: 'Roblox', domain: 'roblox.com', aliases: ['روبلوكس'] },
    { name: 'Minecraft', domain: 'minecraft.net', aliases: ['ماينكرافت'] },
    { name: 'Fortnite', domain: 'fortnite.com', aliases: ['فورتنايت'] },
    { name: 'Steam', domain: 'steampowered.com', aliases: ['ستيم'] },
    { name: 'Origin', domain: 'origin.com', aliases: ['اورجن'] },
    { name: 'Ubisoft', domain: 'ubisoft.com', aliases: ['يوبيسوفت'] },
    { name: 'Activision', domain: 'activision.com', aliases: ['اكتيفجن'] },
    { name: 'EA', domain: 'ea.com', aliases: ['اي ايه'] },
    { name: 'Nestle', domain: 'nestle.com', aliases: ['نستله'] },
    { name: 'Danone', domain: 'danone.com', aliases: ['دانون'] },
    { name: 'Kelloggs', domain: 'kelloggs.com', aliases: ['كيلوقز'] },
    { name: 'Heineken', domain: 'heineken.com', aliases: ['هاينكن'] },
    { name: 'Budweiser', domain: 'budweiser.com', aliases: ['بودوايزر'] },
    { name: 'Guinness', domain: 'guinness.com', aliases: ['جينيس'] },
    { name: 'KFC', domain: 'kfc.com', aliases: ['كنتاكي'] },
    { name: 'Burger King', domain: 'burgerking.com', aliases: ['برجر كنج'] },
    { name: 'Pizza Hut', domain: 'pizzahut.com', aliases: ['بيتزا هت'] },
    { name: 'Dominoes', domain: 'dominos.com', aliases: ['دومينوز بيتزا'] },
    { name: 'Subway', domain: 'subway.com', aliases: ['صب واي'] },
    { name: 'Taco Bell', domain: 'tacobell.com', aliases: ['تاكو بيل'] },
    { name: 'Wendy\'s', domain: 'wendys.com', aliases: ['وينديز'] },
    { name: 'Dunkin', domain: 'dunkindonuts.com', aliases: ['دنكن'] },
    { name: 'ZARA', domain: 'zara.com', aliases: ['زارا'] },
    { name: 'H&M', domain: 'hm.com', aliases: ['اتش اند ام'] },
    { name: 'Uniqlo', domain: 'uniqlo.com', aliases: ['يونيكلو'] },
    { name: 'Gap', domain: 'gap.com', aliases: ['قاب'] },
    { name: 'Levis', domain: 'levi.com', aliases: ['ليفايز'] },
    { name: 'L’Oréal', domain: 'loreal.com', aliases: ['لوريال'] },
    { name: 'Colgate', domain: 'colgate.com', aliases: ['كولجيت'] },
    { name: 'Gillette', domain: 'gillette.com', aliases: ['جيليت'] },
    { name: 'Pampers', domain: 'pampers.com', aliases: ['بامبرز'] },
    { name: 'Johnson & Johnson', domain: 'jnj.com', aliases: ['جونسون'] },
    { name: 'Pfizer', domain: 'pfizer.com', aliases: ['فايزر'] },
    { name: 'Moderna', domain: 'modernatx.com', aliases: ['موديرنا'] },
    { name: 'Shell', domain: 'shell.com', aliases: ['شل'] },
    { name: 'ExxonMobil', domain: 'exxonmobil.com', aliases: ['اكسون موبيل'] },
    { name: 'BP', domain: 'bp.com', aliases: ['بي بي'] },
    { name: 'Chevron', domain: 'chevron.com', aliases: ['شيفرون'] },
    { name: 'TotalEnergies', domain: 'totalenergies.com', aliases: ['توتال'] },
    { name: 'Amazon Web Services', domain: 'aws.amazon.com', aliases: ['اي دبليو اس'] },
    { name: 'Google Cloud', domain: 'cloud.google.com', aliases: ['جوجل كلاود'] },
    { name: 'Microsoft Azure', domain: 'azure.microsoft.com', aliases: ['ازور'] },
    { name: 'Zoom', domain: 'zoom.us', aliases: ['زوم'] },
    { name: 'Salesforce', domain: 'salesforce.com', aliases: ['سيلز فورس'] },
    { name: 'Shopify', domain: 'shopify.com', aliases: ['شوبيفاي'] },
    { name: 'Etsy', domain: 'etsy.com', aliases: ['اتسي'] },
    { name: 'eBay', domain: 'ebay.com', aliases: ['ايباي'] },
    { name: 'AliExpress', domain: 'aliexpress.com', aliases: ['علي اكسبرس'] },
    { name: 'Alibaba', domain: 'alibaba.com', aliases: ['علي بابا'] },
    { name: 'JD.com', domain: 'jd.com', aliases: ['جي دي'] },
    { name: 'Baidu', domain: 'baidu.com', aliases: ['بايدو'] },
    { name: 'Tencent', domain: 'tencent.com', aliases: ['تنسنت'] },
    { name: 'Panasonic', domain: 'panasonic.com', aliases: ['باناسونيك'] },
    { name: 'LG', domain: 'lg.com', aliases: ['ال جي'] },
    { name: 'Sharp', domain: 'sharp-world.com', aliases: ['شارب'] },
    { name: 'Toshiba', domain: 'toshiba.co.jp', aliases: ['توشيبا'] },
    { name: 'Canon', domain: 'canon.com', aliases: ['كانون'] },
    { name: 'Nikon', domain: 'nikon.com', aliases: ['نيكون'] },
    { name: 'Fuji', domain: 'fujifilm.com', aliases: ['فوجي'] },
    { name: 'Olympus', domain: 'olympus-global.com', aliases: ['اوليمبوس'] },
    { name: 'Casio', domain: 'casio.com', aliases: ['كاسيو'] },
    { name: 'Seiko', domain: 'seikowatches.com', aliases: ['سيكو'] },
    { name: 'Swatch', domain: 'swatch.com', aliases: ['سواتش'] },
    { name: 'Omega', domain: 'omegawatches.com', aliases: ['اوميغا'] },
    { name: 'Cartier', domain: 'cartier.com', aliases: ['كارتييه'] },
    { name: 'Tiffany', domain: 'tiffany.com', aliases: ['تيفاني'] },
    { name: 'Swarovski', domain: 'swarovski.com', aliases: ['سواروفسكي'] },
    { name: 'Prada', domain: 'prada.com', aliases: ['برادا'] },
    { name: 'Burberry', domain: 'burberry.com', aliases: ['بربري'] },
    { name: 'Dior', domain: 'dior.com', aliases: ['ديور'] },
    { name: 'Valentino', domain: 'valentino.com', aliases: ['فالنتينو'] },
    { name: 'Versace', domain: 'versace.com', aliases: ['فرزاتشي'] },
    { name: 'Armani', domain: 'armani.com', aliases: ['ارماني'] },
    { name: 'Ralph Lauren', domain: 'ralphlauren.com', aliases: ['رالف لورين'] },
    { name: 'Calvin Klein', domain: 'calvinklein.com', aliases: ['كالفن كلاين'] },
    { name: 'Tommy Hilfiger', domain: 'tommy.com', aliases: ['تومي'] },
    { name: 'Victoria\'s Secret', domain: 'victoriassecret.com', aliases: ['فيكتوريا سيكريت'] },
    { name: 'Under Armour', domain: 'underarmour.com', aliases: ['اندر ارمور'] },
    { name: 'Puma', domain: 'puma.com', aliases: ['بوما'] },
    { name: 'Reebok', domain: 'reebok.com', aliases: ['ريبوك'] },
    { name: 'New Balance', domain: 'newbalance.com', aliases: ['نيو بالانس'] },
    { name: 'ASICS', domain: 'asics.com', aliases: ['اسيكس'] },
    { name: 'Brooks', domain: 'brooksrunning.com', aliases: ['بروكس'] },
    { name: 'Mizuno', domain: 'mizuno.com', aliases: ['ميزونو'] },
    { name: 'YETI', domain: 'yeti.com', aliases: ['يتي'] },
    { name: 'GoPro', domain: 'gopro.com', aliases: ['جو برو'] },
    { name: 'Fitbit', domain: 'fitbit.com', aliases: ['فتبت'] },
    { name: 'Garmin', domain: 'garmin.com', aliases: ['جارمن'] },
    { name: 'Peloton', domain: 'onepeloton.com', aliases: ['بيلوتون'] },
    { name: 'Lululemon', domain: 'lululemon.com', aliases: ['لولو ليمون'] },
    { name: 'North Face', domain: 'thenorthface.com', aliases: ['نورث فيس'] },
    { name: 'Patagonia', domain: 'patagonia.com', aliases: ['باتاجونيا'] },
    { name: 'Columbia', domain: 'columbia.com', aliases: ['كولومبيا'] },
    { name: 'Vans', domain: 'vans.com', aliases: ['فانز'] },
    { name: 'Converse', domain: 'converse.com', aliases: ['كونفرس'] },
    { name: 'Timberland', domain: 'timberland.com', aliases: ['تمبرلاند'] },
    { name: 'Dr. Martens', domain: 'drmartens.com', aliases: ['دكتور مارتنز'] },
    { name: 'Ray-Ban', domain: 'ray-ban.com', aliases: ['ريبان'] },
    { name: 'Oakley', domain: 'oakley.com', aliases: ['اوكلي'] },
    { name: 'Luxottica', domain: 'luxottica.com', aliases: ['لوكسوتيكا'] },
    { name: 'Warby Parker', domain: 'warbyparker.com', aliases: ['واربي باركر'] },
    { name: 'Logitech', domain: 'logitech.com', aliases: ['لوجيتك'] },
    { name: 'Razer', domain: 'razer.com', aliases: ['رايزر'] },
    { name: 'Corsair', domain: 'corsair.com', aliases: ['كورسير'] },
    { name: 'SteelSeries', domain: 'steelseries.com', aliases: ['ستيل سيريز'] },
    { name: 'HyperX', domain: 'hyperx.com', aliases: ['هايبر اكس'] },
    { name: 'WD', domain: 'wd.com', aliases: ['دبليو دي'] },
    { name: 'Seagate', domain: 'seagate.com', aliases: ['سيجيت'] },
    { name: 'Kingston', domain: 'kingston.com', aliases: ['كينغستون'] },
    { name: 'SanDisk', domain: 'sandisk.com', aliases: ['سان ديسك'] },
    { name: 'Dropbox', domain: 'dropbox.com', aliases: ['دروب بوكس'] },
    { name: 'Box', domain: 'box.com', aliases: ['بوكس'] },
    { name: 'Deere', domain: 'deere.com', aliases: ['جون دير'] },
    { name: 'Caterpillar', domain: 'caterpillar.com', aliases: ['كاتربيلر'] },
    { name: '3M', domain: '3m.com', aliases: ['3 ام'] },
    { name: 'Honeywell', domain: 'honeywell.com', aliases: ['هانيويل'] },
    { name: 'General Dynamics', domain: 'gd.com', aliases: ['جنرال دايناميكس'] },
    { name: 'Lockheed Martin', domain: 'lockheedmartin.com', aliases: ['لوكهيد مارتن'] },
    { name: 'Northrop Grumman', domain: 'northropgrumman.com', aliases: ['نورثروب جرومان'] },
    { name: 'SpaceX', domain: 'spacex.com', aliases: ['سبيس اكس'] },
    { name: 'Blue Origin', domain: 'blueorigin.com', aliases: ['بلو اوريجن'] },
    { name: 'Virgin Galactic', domain: 'virgingalactic.com', aliases: ['فيرجن جالاكتيك'] },
    { name: 'Nokia', domain: 'nokia.com', aliases: ['نوكيا'] },
    { name: 'Ericsson', domain: 'ericsson.com', aliases: ['اريكسون'] },
    { name: 'Qualcomm', domain: 'qualcomm.com', aliases: ['كوالكوم'] },
    { name: 'Broadcom', domain: 'broadcom.com', aliases: ['برودكام'] },
    { name: 'AMD', domain: 'amd.com', aliases: ['اي ام دي'] },
    { name: 'MediaTek', domain: 'mediatek.com', aliases: ['ميديا تيك'] },
    { name: 'ARM', domain: 'arm.com', aliases: ['ارم'] },
    { name: 'TSMC', domain: 'tsmc.com', aliases: ['تي اس ام سي'] },
    { name: 'Foxconn', domain: 'foxconn.com.tw', aliases: ['فوكسكون'] },
];

export const LogoRound: React.FC<LogoRoundProps> = ({ onHome, isOBS }) => {
    const [config, setConfig] = useState<GameConfig>({
        joinKeyword: 'شعار',
        maxPlayers: 100,
        roundDuration: 20,
        autoProgress: true,
        totalRounds: 10,
        showHints: true,
        difficulty: 'Easy',
        soundEffects: true,
        streamerMode: false
    });

    const [phase, setPhase] = useState<GamePhase>('SETUP');
    const [participants, setParticipants] = useState<ChatUser[]>([]);
    const [scores, setScores] = useState<Record<string, number>>({});
    const [timer, setTimer] = useState(0);
    const [currentRound, setCurrentRound] = useState(1);
    const [currentBrand, setCurrentBrand] = useState<Brand | null>(null);
    const [roundWinner, setRoundWinner] = useState<ChatUser | null>(null);

    const phaseRef = useRef(phase);
    const configRef = useRef(config);
    const currentBrandRef = useRef(currentBrand);
    const participantsRef = useRef(participants);

    useEffect(() => {
        phaseRef.current = phase;
        configRef.current = config;
        currentBrandRef.current = currentBrand;
        participantsRef.current = participants;
    }, [phase, config, currentBrand, participants]);

    const nextLogo = () => {
        const remainingBrands = POPULAR_BRANDS.filter(b => b.domain !== currentBrand?.domain); // Avoid repeats in sequence
        const random = remainingBrands[Math.floor(Math.random() * remainingBrands.length)];
        setCurrentBrand(random);
        setRoundWinner(null);
        setTimer(config.roundDuration);
        setPhase('PLAYING');
    };

    useEffect(() => {
        const unsubscribe = chatService.onMessage((msg) => {
            const content = msg.content.trim().toLowerCase();
            const username = msg.user.username;

            if (phaseRef.current === 'LOBBY') {
                if (content === configRef.current.joinKeyword.toLowerCase()) {
                    setParticipants(prev => {
                        if (prev.length >= configRef.current.maxPlayers) return prev;
                        if (prev.some(p => p.username === username)) return prev;

                        // Fetch real Kick avatar asynchronously
                        chatService.fetchKickAvatar(username).then(avatar => {
                            if (avatar) {
                                setParticipants(current => current.map(p =>
                                    p.username === username ? { ...p, avatar } : p
                                ));
                            }
                        });

                        return [...prev, msg.user];
                    });
                }
            }

            if (phaseRef.current === 'PLAYING' && currentBrandRef.current) {
                if (!participantsRef.current.some(p => p.username === username)) return;

                const brand = currentBrandRef.current;
                const isCorrect = brand.name.toLowerCase() === content ||
                    brand.aliases.some(a => a === content) ||
                    brand.domain.split('.')[0] === content;

                if (isCorrect) {
                    handleWin(msg.user);
                }
            }
        });
        return () => unsubscribe();
    }, []);

    const handleWin = (user: ChatUser) => {
        setRoundWinner(user);
        setScores(prev => ({ ...prev, [user.username]: (prev[user.username] || 0) + 1 }));
        setPhase('REVEAL');

        setTimeout(() => {
            if (currentRound >= config.totalRounds) {
                setPhase('FINALE');
                leaderboardService.recordWin(user.username, user.avatar || '', 200);
            } else {
                setCurrentRound(r => r + 1);
                nextLogo();
            }
        }, 4000);
    };

    useEffect(() => {
        let interval: number;
        if (phase === 'PLAYING' && timer > 0) {
            interval = window.setInterval(() => {
                setTimer(prev => prev - 1);
            }, 1000);
        } else if (phase === 'PLAYING' && timer === 0) {
            setPhase('REVEAL');
            setTimeout(() => {
                if (currentRound >= config.totalRounds) {
                    setPhase('FINALE');
                } else {
                    setCurrentRound(r => r + 1);
                    nextLogo();
                }
            }, 4000);
        }
        return () => clearInterval(interval);
    }, [phase, timer]);

    const startLobby = () => setPhase('LOBBY');

    const startRound = () => {
        setCurrentRound(1);
        setScores({});
        nextLogo();
    };

    const resetGame = () => {
        setPhase('SETUP');
        setParticipants([]);
        setScores({});
        setCurrentRound(1);
    };

    return (
        <div className="w-full h-full flex flex-col items-center bg-transparent text-right font-display select-none overflow-hidden" dir="rtl">
            {/* Dark Professional Background */}
            <div className="absolute inset-0 bg-[#08080a] -z-10">
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_0%,_rgba(59,130,246,0.1),transparent_70%)]"></div>
                <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-blue-600/5 blur-[120px] rounded-full"></div>
                <div className="absolute top-1/2 left-1/4 w-[400px] h-[400px] bg-indigo-600/5 blur-[100px] rounded-full"></div>
                {/* Brand pattern overlay */}
                <div className="absolute inset-0 opacity-[0.02] bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
            </div>

            {phase === 'SETUP' && (
                <div className="w-full max-w-4xl mt-12 animate-in fade-in zoom-in duration-700">
                    <div className="text-center mb-12">
                        <Globe size={80} className="mx-auto text-blue-500 mb-6 drop-shadow-[0_0_30px_rgba(59,130,246,0.5)]" />
                        <h1 className="text-7xl font-black text-white italic tracking-tighter">جـولـة الـشـعـارات</h1>
                        <p className="text-blue-500 font-black tracking-[0.4em] text-[10px] uppercase mt-2">Premium Brand Challenge</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="glass-card p-10 rounded-[3.5rem] border border-white/10 bg-white/5 backdrop-blur-3xl space-y-8">
                            <h3 className="text-2xl font-black text-white flex items-center gap-3">
                                <Settings className="text-blue-400" /> إعـدادات الـجـولـة
                            </h3>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2 col-span-2">
                                    <label className="text-xs font-bold text-gray-400 uppercase">كلمة الانضمام</label>
                                    <input
                                        value={config.joinKeyword}
                                        onChange={e => setConfig({ ...config, joinKeyword: e.target.value })}
                                        className="w-full bg-black/40 border-2 border-white/10 focus:border-blue-400 rounded-2xl p-3 text-white font-bold outline-none transition-all"
                                    />
                                </div>

                                <div className="space-y-2 col-span-2">
                                    <div className="flex justify-between items-center">
                                        <label className="text-xs font-bold text-gray-400 uppercase">عـدد الـجـولات</label>
                                        <span className="text-xl font-black text-blue-400 font-mono">{config.totalRounds}</span>
                                    </div>
                                    <input
                                        type="range" min="5" max="50" step="5"
                                        value={config.totalRounds}
                                        onChange={e => setConfig({ ...config, totalRounds: +e.target.value })}
                                        className="w-full h-2 bg-white/5 rounded-lg appearance-none cursor-pointer accent-blue-400"
                                    />
                                </div>

                                {/* New Aesthetic Settings (Visual Only/Basic Logic) */}
                                <div className="p-3 bg-white/5 rounded-2xl border border-white/5 flex items-center justify-between group hover:bg-white/10 transition-colors">
                                    <div className="flex items-center gap-2">
                                        <Eye size={16} className="text-blue-400" />
                                        <span className="text-[10px] font-bold text-gray-300">تلميحات ذكية</span>
                                    </div>
                                    <div onClick={() => setConfig({ ...config, showHints: !config.showHints })} className={`w-8 h-4 rounded-full relative cursor-pointer transition-colors ${config.showHints ? 'bg-blue-500' : 'bg-gray-600'}`}>
                                        <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${config.showHints ? 'right-0.5' : 'right-4.5'}`}></div>
                                    </div>
                                </div>

                                <div className="p-3 bg-white/5 rounded-2xl border border-white/5 flex items-center justify-between group hover:bg-white/10 transition-colors">
                                    <div className="flex items-center gap-2">
                                        <Layers size={16} className="text-purple-400" />
                                        <span className="text-[10px] font-bold text-gray-300">الصعوبة</span>
                                    </div>
                                    <span onClick={() => setConfig({ ...config, difficulty: config.difficulty === 'Easy' ? 'Hard' : 'Easy' })} className="text-[10px] font-black bg-black/40 px-2 py-1 rounded-lg cursor-pointer hover:text-white transition-colors text-gray-400 uppercase">{config.difficulty}</span>
                                </div>

                                <div className="p-3 bg-white/5 rounded-2xl border border-white/5 flex items-center justify-between group hover:bg-white/10 transition-colors">
                                    <div className="flex items-center gap-2">
                                        <Volume2 size={16} className="text-green-400" />
                                        <span className="text-[10px] font-bold text-gray-300">مؤثرات صوتية</span>
                                    </div>
                                    <div onClick={() => setConfig({ ...config, soundEffects: !config.soundEffects })} className={`w-8 h-4 rounded-full relative cursor-pointer transition-colors ${config.soundEffects ? 'bg-green-500' : 'bg-gray-600'}`}>
                                        <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${config.soundEffects ? 'right-0.5' : 'right-4.5'}`}></div>
                                    </div>
                                </div>

                                <div className="p-3 bg-white/5 rounded-2xl border border-white/5 flex items-center justify-between group hover:bg-white/10 transition-colors">
                                    <div className="flex items-center gap-2">
                                        <Monitor size={16} className="text-orange-400" />
                                        <span className="text-[10px] font-bold text-gray-300">وضع البث</span>
                                    </div>
                                    <div onClick={() => setConfig({ ...config, streamerMode: !config.streamerMode })} className={`w-8 h-4 rounded-full relative cursor-pointer transition-colors ${config.streamerMode ? 'bg-orange-500' : 'bg-gray-600'}`}>
                                        <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${config.streamerMode ? 'right-0.5' : 'right-4.5'}`}></div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col gap-6">
                            <div className="glass-card p-10 rounded-[3.5rem] border border-white/10 bg-white/5 backdrop-blur-3xl flex-1 flex flex-col justify-center items-center text-center">
                                <Target size={54} className="text-indigo-400 mb-4 animate-float" />
                                <h4 className="text-xl font-black text-white mb-2">قـواعـد الـمـنـافـسة</h4>
                                <p className="text-gray-400 text-sm font-bold leading-relaxed px-6">
                                    ستظهر شعارات لماركات عالمية، حاول تخمين اسم الماركة في الشات بأسرع وقت ممكن. أول من يجيب بشكل صحيح يحصل على نقطة!
                                </p>
                            </div>

                            <button
                                onClick={startLobby}
                                className="w-full bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 text-white font-black py-8 rounded-[3rem] text-4xl shadow-[0_20px_50px_rgba(37,99,235,0.3)] transition-all flex items-center justify-center gap-4 group"
                            >
                                بـدأ الـبـحـث <Search className="group-hover:scale-125 transition-transform" />
                            </button>
                        </div>
                    </div>

                    <button onClick={onHome} className="mt-8 mx-auto flex items-center gap-2 text-gray-500 hover:text-white font-bold transition-all">
                        <ChevronLeft /> العودة للرئيسية
                    </button>
                </div>
            )}

            {phase === 'LOBBY' && (
                <div className="w-full max-w-6xl mt-12 animate-in fade-in duration-700 flex flex-col items-center">
                    <div className="text-center mb-12">
                        <h1 className="text-8xl font-black text-white italic tracking-tighter mb-4 red-neon-text">تـقـصـي الـحـقـائق</h1>
                        <div className="flex items-center justify-center gap-4 bg-white/5 px-10 py-5 rounded-[2.5rem] border border-white/10 backdrop-blur-md shadow-2xl">
                            <span className="text-2xl font-bold text-gray-300">أرسل الكلمة للانـضمـام للتحـدي:</span>
                            <span className="text-5xl font-black text-blue-400 px-8 py-2 bg-blue-400/10 rounded-2xl border border-blue-400/30">{config.joinKeyword}</span>
                        </div>
                    </div>

                    <div className="w-full grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6 px-10 mb-20 overflow-y-auto max-h-[500px] custom-scrollbar">
                        {participants.map((p, i) => (
                            <div key={p.username} className="glass-card p-5 rounded-[2.5rem] border border-white/5 flex flex-col items-center gap-4 animate-in zoom-in group hover:border-blue-500/30 transition-all bg-white/5" style={{ animationDelay: `${i * 30}ms` }}>
                                <div className="w-24 h-24 rounded-[2rem] overflow-hidden border-4 border-white/10 shadow-xl group-hover:scale-105 transition-transform bg-zinc-900 flex items-center justify-center">
                                    {p.avatar ? (
                                        <img src={p.avatar} className="w-full h-full object-cover" alt="" />
                                    ) : (
                                        <User className="text-white/20" size={48} />
                                    )}
                                </div>
                                <span className="font-black text-white text-base truncate w-full text-center">{p.username}</span>
                            </div>
                        ))}
                    </div>

                    <div className="fixed bottom-12 left-0 right-0 flex justify-center gap-8">
                        <button onClick={resetGame} className="px-10 py-6 bg-white/5 hover:bg-white/10 rounded-[2.5rem] text-gray-400 font-black border border-white/10 transition-all flex items-center gap-3">
                            <Trash2 size={24} /> إلـغـاء
                        </button>
                        <button
                            onClick={startRound}
                            disabled={participants.length < 1}
                            className="px-24 py-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 disabled:grayscale rounded-[2.5rem] text-white font-black text-3xl shadow-[0_20px_40px_rgba(37,99,235,0.3)] transition-all flex items-center gap-4"
                        >
                            <Play size={32} /> بـدء الـجـولة الأولى ({participants.length})
                        </button>
                    </div>
                </div>
            )}

            {(phase === 'PLAYING' || phase === 'REVEAL') && currentBrand && (
                <div className="w-full h-full flex flex-col items-center justify-center p-8 relative">
                    {/* Header Info */}
                    <div className="absolute top-10 left-10 right-10 flex justify-between items-start">
                        <div className="flex flex-col gap-4">
                            <div className="glass-card px-10 py-5 rounded-[2.5rem] border border-white/10 flex items-center gap-6 bg-black/60 backdrop-blur-xl">
                                <div className="text-right">
                                    <div className="text-[10px] font-black text-blue-500 uppercase tracking-widest">الـجـولـة</div>
                                    <div className="text-5xl font-black text-white font-mono">{currentRound} / {config.totalRounds}</div>
                                </div>
                                <Target size={40} className="text-blue-500" />
                            </div>
                            <div className="glass-card px-10 py-5 rounded-[2.5rem] border border-white/10 flex items-center gap-6 bg-black/60 backdrop-blur-xl">
                                <div className="text-right">
                                    <div className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">الـوقـت</div>
                                    <div className={`text-4xl font-black font-mono ${timer < 5 ? 'text-red-500 animate-pulse' : 'text-white'}`}>{timer}s</div>
                                </div>
                                <Clock size={32} className={timer < 5 ? 'text-red-500' : 'text-gray-500'} />
                            </div>
                        </div>

                        <div className="glass-card w-80 rounded-[3rem] border border-white/10 bg-black/60 backdrop-blur-xl overflow-hidden shadow-2xl">
                            <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
                                <h3 className="font-black text-white italic">أفـضل الـمحـققين</h3>
                                <ShieldCheck size={18} className="text-blue-500" />
                            </div>
                            <div className="p-5 space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar">
                                {Object.entries(scores).sort((a, b) => (b[1] as number) - (a[1] as number)).slice(0, 5).map(([user, score], i) => (
                                    <div key={user} className="flex items-center gap-4 bg-white/5 p-4 rounded-3xl border border-white/5 transition-all hover:bg-white/10">
                                        <div className="w-12 h-12 rounded-2xl bg-blue-600/20 flex items-center justify-center text-white font-black text-xl border border-blue-500/30">
                                            #{i + 1}
                                        </div>
                                        <div className="flex-1">
                                            <div className="text-sm font-black text-white">{user}</div>
                                            <div className="text-xs text-blue-400 font-bold">{score} شعارات صـحيحة</div>
                                        </div>
                                    </div>
                                ))}
                                {Object.keys(scores).length === 0 && (
                                    <div className="py-10 text-center opacity-20 italic font-bold">لا يـوجد نقـاط بـعـد</div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Logo Display Area */}
                    <div className="text-center animate-in zoom-in duration-500 flex flex-col items-center gap-12">
                        <div className="relative group">
                            {/* Decorative Rings */}
                            <div className="absolute -inset-20 border-2 border-dashed border-white/5 rounded-full animate-rotate-slow"></div>
                            <div className="absolute -inset-10 border-4 border-blue-500/5 rounded-full animate-rotate-reverse"></div>

                            <div className={`w-[450px] h-[450px] bg-white rounded-[4rem] flex items-center justify-center p-16 shadow-[0_0_100px_rgba(255,255,255,0.1),0_40px_100px_rgba(0,0,0,0.5)] border-8 border-zinc-900 transition-all duration-500 ${phase === 'REVEAL' ? 'scale-110 shadow-blue-500/20' : ''}`}>
                                <img
                                    src={`https://img.logo.dev/${currentBrand.domain}?token=pk_CsRwP1H7Tkmc2rq8g3LWdw`}
                                    className="w-full h-full object-contain filter-none"
                                    alt="Brand Logo"
                                />

                                {phase === 'PLAYING' && (
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                        <Search size={150} className="text-black/5" />
                                    </div>
                                )}
                            </div>
                        </div>

                        {phase === 'PLAYING' ? (
                            <div className="space-y-4">
                                <h2 className="text-6xl font-black text-white italic tracking-tighter drop-shadow-2xl">خـمّـن اسـم الـشـعـار!</h2>
                                <p className="text-2xl text-gray-500 font-bold uppercase tracking-widest animate-pulse">أرسل الإجابة في الشات حـالا!</p>
                            </div>
                        ) : (
                            <div className="animate-in slide-in-from-bottom duration-500 space-y-6">
                                {roundWinner ? (
                                    <div className="flex flex-col items-center gap-6 bg-green-500/10 p-8 rounded-[3rem] border-4 border-green-500/30 backdrop-blur-xl">
                                        <div className="text-green-500 font-black text-2xl uppercase tracking-[0.5em] mb-2">إجـابـة مـذهـلـة</div>
                                        <div className="flex items-center gap-8">
                                            <div className="w-32 h-32 rounded-[2.5rem] overflow-hidden border-4 border-green-500 shadow-xl bg-zinc-900 flex items-center justify-center">
                                                {roundWinner.avatar ? (
                                                    <img src={roundWinner.avatar} className="w-full h-full object-cover" alt="" />
                                                ) : (
                                                    <User className="text-white/20" size={64} />
                                                )}
                                            </div>
                                            <div className="text-right">
                                                <div className="text-6xl font-black text-white italic tracking-tighter mb-2">{roundWinner.username}</div>
                                                <div className="text-3xl font-bold text-gray-400">الإجـابـة: <span className="text-white text-5xl mr-4">{currentBrand.name}</span></div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center gap-6 bg-red-500/10 p-10 rounded-[4rem] border-4 border-red-500/30 backdrop-blur-xl">
                                        <h2 className="text-6xl font-black text-white opacity-50 italic">انـتهـى الـوقت!</h2>
                                        <p className="text-3xl font-bold text-gray-400">الإجـابة كانت: <span className="text-white text-6xl mr-6">{currentBrand.name}</span></p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {phase === 'FINALE' && (
                <div className="w-full h-full flex flex-col items-center justify-center p-10 animate-in fade-in duration-1000">
                    <div className="mb-12 relative">
                        <div className="absolute inset-0 bg-blue-500 blur-[150px] opacity-20 rounded-full"></div>
                        <ShieldCheck size={180} className="text-blue-500 animate-pulse relative z-10" />
                    </div>

                    <h1 className="text-9xl font-black text-white italic tracking-tighter mb-4 drop-shadow-[0_20px_60px_rgba(59,130,246,0.3)]">أقـوى محـقق</h1>

                    {Object.entries(scores).sort((a, b) => (b[1] as number) - (a[1] as number))[0] && (
                        <div className="flex flex-col items-center gap-8 mb-20 animate-in zoom-in duration-700 delay-300">
                            <div className="w-72 h-72 rounded-[4rem] overflow-hidden border-8 border-blue-500 shadow-[0_0_120px_rgba(59,130,246,0.4)] relative bg-black/40 backdrop-blur-xl flex items-center justify-center">
                                {participants.find(p => p.username === Object.entries(scores).sort((a, b) => (b[1] as number) - (a[1] as number))[0][0])?.avatar ? (
                                    <img src={participants.find(p => p.username === Object.entries(scores).sort((a, b) => (b[1] as number) - (a[1] as number))[0][0])?.avatar} className="w-full h-full object-cover" alt="" />
                                ) : (
                                    <User className="text-white/20" size={120} />
                                )}
                            </div>
                            <div className="text-center">
                                <div className="text-8xl font-black text-white mb-6 italic tracking-tighter">{Object.entries(scores).sort((a, b) => (b[1] as number) - (a[1] as number))[0][0]}</div>
                                <div className="text-4xl px-20 py-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black rounded-[2.5rem] shadow-2xl uppercase tracking-[0.2em] italic">
                                    SCORE: {Object.entries(scores).sort((a, b) => (b[1] as number) - (a[1] as number))[0][1]} LOGOS
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="flex gap-8">
                        <button onClick={onHome} className="px-16 py-7 bg-white/5 hover:bg-white/10 text-white font-black rounded-[2.5rem] border border-white/10 transition-all text-2xl">
                            الـرئـيـسـيـة
                        </button>
                        <button onClick={resetGame} className="px-24 py-7 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-[2.5rem] transition-all text-3xl shadow-[0_20px_50px_rgba(37,99,235,0.3)] hover:scale-105">
                            تـحـدي جـديد
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
