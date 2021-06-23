import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import * as os from 'os';
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import * as FormData from 'form-data';
import axiosCookieJarSupport from 'axios-cookiejar-support';
import * as https from 'https';
import * as rm from 'typed-rest-client';
import * as httpm from 'typed-rest-client/HttpClient';
import * as toughCookie from 'tough-cookie';
import { threadId } from "worker_threads";
import { ZhihuUserInfo } from "../models/zhiHuModel";
/**
 * Prefetch QRCode https://www.zhihu.com/api/v3/account/api/login/qrcode
 * Get QRCode https://www.zhihu.com/api/v3/account/api/login/qrcode/${token}/image
 * Query ScanInfo https://www.zhihu.com/api/v3/account/api/login/qrcode/${token}/scan_info
 */
const zhihuBaseUrl = 'https://www.zhihu.com';
const qrCodeUrl = `${zhihuBaseUrl}/api/v3/account/api/login/qrcode`;
const uDIDUrl = `${zhihuBaseUrl}/udid`;
/**
 * Helper link to indicate if already login in
 */
const signUpRedirectPage = 'https://www.zhihu.com/signup';
export class ZhihuService {
    cookieJar: toughCookie.CookieJar;
    api: AxiosInstance;
    context:vscode.ExtensionContext;
    /**
     *
     */
    constructor(context: vscode.ExtensionContext) {
        this.cookieJar = new toughCookie.CookieJar();
        this.api = axios.create({
            withCredentials: true,
            headers:{
                'user-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4099.0 Safari/537.36 Edg/83.0.473.0',
                'authority': 'www.zhihu.com'
            }
        });
        this.context = context;
        axiosCookieJarSupport(this.api);
    }
    public async login() {
        vscode.window.showInformationMessage("知乎登陆");
        let r = await this.getUserInfo();
        console.log(r);
        await this.qrcodeLogin();
        r = await this.getUserInfo();
        console.log(r);
    }
    
    protected async qrcodeLogin() {
        try {
            //pre-hand before get qrcode token
            await this.api.post('https://www.zhihu.com/udid', null, {
                jar: this.cookieJar,
                withCredentials: true
            });
            //retrive token
            let token:any = await this.api.post(qrCodeUrl, null, {
                jar: this.cookieJar,
                withCredentials: true
            });
            //save qrcode image
            let qrcodeImg = `${qrCodeUrl}/${token.data.token}/image`; 
            let qrCodeImgBody = await this.api.get(qrcodeImg,{
                // jar: this.cookieJar,
                // withCredentials: true,
                responseType: 'arraybuffer'
            });
            let localQrCode = path.join(this.context.extensionPath, 'qrcode.png');
            fs.writeFileSync(localQrCode, qrCodeImgBody.data);
            console.log(this.context.extensionPath, 'qrcode.png');
            
            let panel = vscode.window.createWebviewPanel(
                'zhihu',
                '知乎登陆',
                vscode.ViewColumn.One,
                {}
            );
            const imgSrc = panel.webview.asWebviewUri(vscode.Uri.file(
                path.join(this.context.extensionPath, './qrcode.png')
            ));   
            panel.webview.html = `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Cat Coding</title>
            </head>
            <body style="background-color: white;">
                <img src="${qrcodeImg}" width="300" />
            </body>
            </html>`;
            let statusToken = token.data.token; 
            
            let intervalId = setInterval(async (statusToken,cookieJar,api) => {
                api.get(`${qrCodeUrl}/${statusToken}/scan_info`,{
                    jar: cookieJar,
                    withCredentials: true
                }).then((status: any) =>{
                    if (status.status === 1) {
                        vscode.window.showInformationMessage('请在手机上确认登录！');
                    } else if(status === 6){
                        statusToken = status.new_token.token;
                    }
                    else if (status.user_id) {
                        clearInterval(intervalId);
                        panel.dispose();
                        api.get('https://www.zhihu.com/api/v4/me',{
                            jar: cookieJar,
                            withCredentials: true
                        }).then((res:any)=>{
                            console.log(res);
                            vscode.window.showInformationMessage(`你好，${res.name}`);
                        });

                    }   
                }).catch((err:any)=>{
                    console.log(err);
                    clearInterval(intervalId);
                });

                // console.log(`${qrCodeUrl}/${statusToken}/scan_info`);
                // console.log(cookieJar);
                
                // let status:any = await api.get(`${qrCodeUrl}/${statusToken}/scan_info`,{
                //     jar: cookieJar,
                //     withCredentials: true
                // });
                // console.log(status);
                // if (status.status === 1) {
                //     vscode.window.showInformationMessage('请在手机上确认登录！');
                // } else if(status === 6){
                //     statusToken = status.new_token.token;
                // }
                // else if (status.user_id) {
                //     clearInterval(intervalId);
                //     panel.dispose();
                //     let self:any = await api.get('https://www.zhihu.com/api/v4/me',{
                //         jar: cookieJar,
                //         withCredentials: true
                //     });
                //     vscode.window.showInformationMessage(`你好，${self.name}`);
                // }                
            }, 2000,statusToken,this.cookieJar,this.api);

        } catch (error) {
            console.log(error);
        }
    }
    protected async getUserInfo():Promise<ZhihuUserInfo>{
        let currentUser:any;
        try {
            let userInfoBoy = await this.api.get<ZhihuUserInfo>('https://www.zhihu.com/api/v4/me',{
                        jar: this.cookieJar,
                        withCredentials: true
                    });
            currentUser = userInfoBoy.data;            
        } catch (error) {
            console.error(error);
            if (error.response.status === 401) {
                vscode.window.showInformationMessage('User is not login');
            }
            console.error(error);
        } 
        return currentUser;       
    }
    // protected async qrcodeLogin() {
    //     axios.defaults.withCredentials = true;
    //     const axiosCookieJarSupport = require('axios-cookiejar-support').default;
    //     const tough = require('tough-cookie');
    //     axiosCookieJarSupport(axios);
    //     let cookieJar = new tough.CookieJar();
    //     var api = axios.create({
    //         baseURL:'https://www.zhihu.com',
    //         withCredentials: true,
    //     });
    //     //pre-hand before get qrcode token
    //     api.post('https://www.zhihu.com/udid',null,{
    //         jar:cookieJar,
    //         withCredentials: true
    //     }).then(async res =>{
    //         console.log(res.data);

    //         await api.post(qrCodeUrl, null,{
    //             jar:cookieJar,
    //             withCredentials: true
    //         }).then(res1 =>{
    //             console.log(res1)
    //         }).catch((error: any) =>{
    //             console.log(error);
    //         });
    //     }).catch(err =>{
    //         console.log(err);
    //     });

    // }
    // protected async test(){
    //     const axiosCookieJarSupport = require('axios-cookiejar-support').default;
    //     let rest:httpm.HttpClient = new httpm.HttpClient('zhihu');
    //     const tough = require('tough-cookie');
    //     let cookieJar = new tough.CookieJar();
    //     var headers = {
    //         'cookie':cookieJar
    //     }
    //     let bb = await rest.post('https://www.zhihu.com/udid',"",headers)    ;
    //     let body: string = await bb.readBody();  
    //     let res2 = await rest.post('https://www.zhihu.com/api/v3/account/api/login/qrcode',"",headers);
    //     let body2: string = await res2.readBody();    
    // }
}