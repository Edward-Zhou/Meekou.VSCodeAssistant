/* eslint-disable @typescript-eslint/naming-convention */
export interface ZhihuUserInfo{
    id:                               string;
    url_token:                        string;
    name:                             string;
    use_default_avatar:               boolean;
    avatar_url:                       string;
    avatar_url_template:              string;
    is_org:                           boolean;
    type:                             string;
    url:                              string;
    user_type:                        string;
    headline:                         string;
    gender:                           number;
    is_advertiser:                    boolean;
    vip_info:                         VipInfo;
    uid:                              string;
    default_notifications_count:      number;
    follow_notifications_count:       number;
    vote_thank_notifications_count:   number;
    messages_count:                   number;
    is_realname:                      boolean;
    has_applying_column:              boolean;
    has_add_baike_summary_permission: boolean;
    editor_info:                      string[];
}
export interface VipInfo {
    is_vip:            boolean;
    rename_days:       string;
    entrance_v2:       null;
    rename_frequency:  number;
    rename_await_days: number;
}
