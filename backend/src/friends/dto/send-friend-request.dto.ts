export class FriendsGetDto {
  friends_list: string[];
}

export class FriendsRequestDto {
  requester_id: string;
  receiver_id: string;
}

export class friendsAcceptDto {
  requester_id: string;
  receiver_id: string;
}

export class friendsRejectDto {
  requester_id: string;
  receiver_id: string;
}

export class friendsDeleteDto {
  id_removed: string;
}
