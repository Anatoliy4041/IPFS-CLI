
pragma solidity ^0.4.14;


contract Authority {
    address                     public owner;            // Address of owner of authority instance
    uint                        public fee;              // Commision of each transaction
    mapping(address => bool)           buyerBlackList;   // Block list of buyers
    mapping(address => bool)           sellerBlackList;  // Block list of sellers
    mapping(bytes32 => address)        pubKeys;          // Set of public keys of buyers
    uint                        public maxTimeToUpload;  // Maximum time for upload data.
    // If timeout - transaction will be declined
    uint                        public maxTimeToConfirm; // Maximum time for confirm.
    // If timeout, confirm will be automaticaly
    uint                        public reserve;          // Amount of reservation
    modifier ownerOnly() {
        assert(msg.sender == owner);
        _;
    }
    
    address public buyInfoAddr;
    event ContractEvent(address returnValue);

    /**
     * Create Authority contract with custom owner.
     * If owner not defined (0x0), then initiator becomes owner
     */
    function Authority(address ownerAd) {
        if(ownerAd == 0x0)
        ownerAd = msg.sender;
        owner = ownerAd;
        maxTimeToUpload = 2 minutes;
        maxTimeToConfirm = 2 days;
        fee = 1 wei;
    }

    /**
     * Transfer ownership to other
     */
    function setOwner(address newOwner) ownerOnly {
        owner = newOwner;
    }


    /**
     *  Create contract to buy information and register them in authority center.
      * Authority center will check contract
     */
    function createBuyContract(address company, string buyerPubKey, string dataH, string idH) payable returns (address) {
        //assert(msg.value >= contractPrice() + fee);
        reserve += msg.value;
        BuyInfo buyInfo = new BuyInfo(company,buyerPubKey, dataH, idH, this, contractPrice(), fee);
        ContractEvent(buyInfo);
        //buyInfoAddr = buyInfo;
        return buyInfo;
    }
    
    //
    function getBuyInfo() constant returns (address) {
        return buyInfoAddr;
    }


    function contractPrice() constant returns (uint) {
        return 100 wei;
    }

    /**
     * Check contracts, transfer money to seller or buyer, remove old.
     */
    function processPendingContract(address buyInfoAd) {
        BuyInfo buyInfo = BuyInfo(buyInfoAd);
        //assert(buyInfo.buyer() == msg.sender);

        //assert(buyInfo.authority() == address(this));

        if(buyInfo.isConfirmed()) {
            // Send money to seller
            buyInfo.seller().transfer(buyInfo.price());
        } else if (buyInfo.isDeclined()) {
            // Return money (except fee) to buyer
            buyInfo.buyer().transfer(buyInfo.price());
        } else if(!buyInfo.isFreezed()) {
            if(buyInfo.isWaitingForUpload() && now - buyInfo.created() > maxTimeToUpload) {
                // SLA failed by seller
                // Decline - on next iteration buyer will be got money
                buyInfo.decline();
            } else if(buyInfo.isWaitingForConfirmation() && now - buyInfo.uploaded() > maxTimeToConfirm) {
                // Buyer forgot confirm - force close contract
                buyInfo.confirm();
            }
        }
    }


    /**
     * Set new fee. This not affects already created contracts
     */
    function setFee(uint newFee) ownerOnly {
        fee = newFee;
    }

    /**
     * Block account to prevent him sell something
     */
    function blockSeller(address seller) ownerOnly {
        sellerBlackList[seller] = true;
    }

    /**
     * Unblock accout and allow him sell something
     */
    function unblockSeller(address seller) ownerOnly {
        delete sellerBlackList[seller];
    }

    /**
     * Check that seller is not blocked
     */
    function isSellerBlocked(address seller) constant returns(bool) {
        return sellerBlackList[seller];
    }

    /**
     * Block account to prvent him buy something
     */
    function blockBuyer(address buyer) ownerOnly {
        buyerBlackList[buyer] = true;
    }

    /**
     * Unblock accout and allow him buy something
     */
    function unblockBuyer(address buyer) ownerOnly {
        delete buyerBlackList[buyer];
    }

    /**
     * Check that buyer is not blocked
     */
    function isBuyerBlocked(address buyer) constant returns(bool) {
        return buyerBlackList[buyer];
    }

    /**
     * Check that this public key is used (by sign sha256)
     */
    function isPubKeySignUsed(bytes32 sha256Sign, address sender) constant returns(bool) {
        return pubKeys[sha256Sign] == sender;
    }

    /**
     * Check that this public key is used
     */
    function isPubKeyUsed(string pubKey, address sender) constant returns(bool) {
        return isPubKeySignUsed(sha256(pubKey), sender);
    }

    /**
     * Mark key sign as used and add to set
     */
    function markPubKeySignAsUsed(bytes32 sha256Sign, address sender) ownerOnly {
        pubKeys[sha256Sign] = sender;
    }

    /**
     * Mark key as used and add to set
     */
    function markPubKeyAsUsed(string pubKey, address sender) ownerOnly {
        pubKeys[sha256(pubKey)] = sender;
    }

    /**
     * Set maximum time for upload encrypted data
     */
    function setMaxTimeToUpload(uint maxTime) ownerOnly {
        maxTimeToUpload = maxTime;
    }

    /**
    * Set maximum time for confirmartion
    */
    function setMaxTimToConfirm(uint maxTime) ownerOnly {
        maxTimeToConfirm = maxTime;
    }
}

/**
 * Contract betwen client and information seller for buy information excatly about
 * person with provided hash of identity (idHash) and hash of payload
 */
contract BuyInfo {
    enum State {
    New,
    DataUploaded,
    ConfirmedByBuyer,
    ConfirmedByAuthority,
    DeclinedByAuthority,
    Freezed
    }

    address public buyer;         // Address of client that buy information
    address public seller;        // Address of company that sell information
    address public authority;     // Address of Authority contract
    string  public dataHash;      // Hash of full information
    string  public idHash;        // Hash of identity of oject to buy
    string  public pubKey;        // Public key of buyer
    string  public encryptedData; // Encrypted by pubKey information
    State   public state;         // Contract status

    uint    public price;         // Price for contract. Set by authority
    uint    public fee;           // Fee by euthority
    uint    public created;       // Timestamp when contract created
    uint    public uploaded;      // Timestamp when contract got data
    uint    public closed;        // Timestamp when contract donee
    uint    public freezed;       // Timestamp when contract freezed

    event DataUploaded(string returnValue);         // Notify that data uploaded by seller
    event Closed(State state);    // Notify when contract is closed (confirmed or declined)

    /**
     * Create contract to buy information
     */
    function BuyInfo (address company, string buyerPubKey, string dataH, string idH, address authorityH, uint priceV, uint feeV) {
        buyer = tx.origin;
        seller = company;
        authority = authorityH;
        pubKey = buyerPubKey;
        state = State.New;
        dataHash = dataH;
        idHash = idH;
        price = priceV;
        fee = feeV;
    }

    /**
     * Upload encrypted data to contract.
     * Can be used once and only by seller
     */
    function uploadData(string encData) {
        assert(msg.sender == seller); // Allow only seller
        assert(state == State.New);
        bytes memory tempData = bytes(encryptedData);
        assert(tempData.length == 0); // Disallow multiple set

        encryptedData = encData;
        state = State.DataUploaded;
        uploaded = now;
        DataUploaded(encData);
    }


    /**
     * Confirm, that contract is done.
     * Can be invoked by buyer or authority and only in state 1 or in state 5
     */
    function confirm() {
        // assert(state == State.DataUploaded || state == State.Freezed);
        bool _isClosed = false;
        if(msg.sender == buyer) {
            state = State.ConfirmedByBuyer; // Normal confirm
            _isClosed = true;
        } else if(msg.sender == authority) {
            state = State.ConfirmedByAuthority; // Force confirmed
            _isClosed = true;
        }
        if(_isClosed) {
            closed = now;
            Closed(state);
        }
    }

    /**
     * Decline contract. Can be done only by authority center in state 1 or state 5 (freeze)
     */
    function decline() {
        assert(state == State.DataUploaded || state == State.Freezed);
        assert(msg.sender == authority);

        state = State.DeclinedByAuthority;
        closed = now;
        Closed(state);
    }

    /**
     * Freeze contract. Can be done only by authority center in state 1
     */
    function freeze() {
        assert(state == State.DataUploaded || state == State.Freezed);
        assert(msg.sender == authority);
        freezed = now;
        state = State.Freezed;
    }

    /**
     * Check that contract is closed: confirmed or declined
     */
    function isClosed() constant returns (bool) {
        return isDeclined() || isConfirmed();
    }

    /**
     * Check that contract is confirmed. No matter by authority or buyer
     */
    function isConfirmed() constant returns (bool) {
        return state == State.ConfirmedByBuyer || state == State.ConfirmedByAuthority;
    }

    /**
     * Check that contract is declined by authority
     */
    function isDeclined() constant returns (bool) {
        return state == State.DeclinedByAuthority;
    }

    /**
     * Check that contract is freezed by authority
     */
    function isFreezed() constant returns (bool) {
        return state == State.Freezed;
    }

    /**
     * Check that contract is waiting for uploading
     */
    function isWaitingForUpload() constant returns (bool) {
        return state == State.New;
    }

    /**
     * Check that contract is waiting for uploading
     */
    function isWaitingForConfirmation() constant returns (bool) {
        return state == State.DataUploaded;
    }

    /**
     * Get sha-256 signature of pub-key
     */
    function getPubKeySign() constant returns (bytes32) {
        return sha256(pubKey);
    }

}
